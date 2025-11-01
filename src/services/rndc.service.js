const turf = require("@turf/turf");
const DbConfig = require("../config/db");
const RNDCService = require("../util/RNDC.service");
const { dateUtils } = require("../util/date.util");
const { turfUtils } = require("../util/turf.util");
const TIPO_INGRESO = {
    SALIDA: 'salida',
    CARGUE: 'cargue',
    DESCARGUE: 'descargue'
};

const rndcConectionService = new RNDCService();
const rndcService = {
    /**
* Encuentra los puntos GPS más cercanos a cada punto de control por viaje.
* @param {Array} gpsPoints - Lista de puntos GPS [{ latitud, longitud, id_viaje }]
* @param {Array} controlPoints - Lista de puntos de control [{ latitud, longitud, id_viaje }]
* @param {Array} trips - Lista de viajes [{ id_viaje }]
* @returns {Array} Lista de coincidencias [{ viaje_id, punto_control_id, gps_id, distancia_m }]
*/
    async puntosCercanosPorViaje() {
        const resultados = [];
        try {
            // Si no se proporcionan datos, consultar desde la base de datos
            const manifiestos = await DbConfig.executeQuery(`SELECT * FROM rndc_consultas WHERE estado = 1`);

            if (!manifiestos.success) {
                console.error('Error consultando manifiestos:', manifiestos.error);
                return { statusCode: 200, message: 'Hubo un error al consultar los manifiestos', data: {} };
            }

            if (!manifiestos.data || manifiestos.data.length <= 0) {
                console.error('No hay manifiestos activos para procesar.');
                return { statusCode: 200, message: 'No hay manifiestos para procesar', data: {} };
            }

            for (const manifiesto of manifiestos.data) {

                const controlPoints = await DbConfig.executeQuery(`SELECT * FROM rndc_puntos_control WHERE id_viaje = ?`, [manifiesto.id_viaje]);

                if (!controlPoints.success) {
                    console.error('Error consultando puntos de control:', controlPoints.error);
                    continue;
                }

                const puntosParaCYD = this.obtenerPuntosDeCargueDescargue(controlPoints.data);

                if (!puntosParaCYD.success) {
                    console.error('Error obteniendo puntos de cargue/descargue:', puntosParaCYD.error);
                    continue;
                }

                const { puntosCargueYDescargue } = puntosParaCYD.data;

                for (const punto of controlPoints.data) {

                    const coordenadas = await DbConfig.executeQuery(`SELECT * FROM track_trailer WHERE id_viaje = ? ORDER BY fecha_track ASC`, [punto.id_viaje]);
                    if (!coordenadas.success) {
                        console.error('Error consultando coordenadas GPS:', coordenadas.error);
                        continue;
                    }

                    if (punto.estado == 2)  continue;
                    

                    if (punto.estado == 0) {
                        const generarEntrada = await this.generarEntrada(punto, coordenadas);
                    }

                    //Verifico que los puntos de cargue y descargue cumplan con los tiempos pactados
                    if (punto.fecha_cita) {
                        const puntosCargueDescargueValidos = this.verificarTiemposPuntosCargueDescargue(punto, coordenadas.data);

                        //Si no cumple con los tiempos, se tiene que enviar un reporte de novedad a RNDC
                        if(!puntosCargueDescargueValidos.data) {
                            const reporteNovedad = await rndcConectionService.reportarNovedadRndc({
                                NUMIDGPS: coordenadas.data[0].imei,
                                INGRESOIDMANIFIESTO: punto.id_viaje,
                                CODPUNTOCONTROL: punto.id_punto,
                                NUMPLACA: manifiesto.placa_vehiculo,
                             }, 1);

                            if(!reporteNovedad || !reporteNovedad.success){
                                console.error('Error reportando novedad a RNDC para el punto de control ID:', punto.id_punto);
                                continue;
                            }
                        }
                    }

                    if (punto.estado == 1) {
                        const generarSalida = await this.generarSalida(punto, coordenadas);
                        if (generarSalida && generarSalida.success) {
                            const tipoXml = puntosCargueYDescargue.includes(punto.id_punto) ? TIPO_INGRESO.CARGUE : TIPO_INGRESO.SALIDA;
                            const xmlJson = this.generarXMLINJSON(manifiesto, generarSalida.data, coordenadas.data[0], tipoXml);
                            resultados.push({ tipo: tipoXml, data: xmlJson.data });
                        }

                    }
                }
            }
            const xmlResponses = [];

            for (const resultado of resultados) {

                // Obtener las respuestas correctamente
                const responseXML = await rndcConectionService.createRegistroCargueDescargue(resultado.data);

                if (resultado.tipo === TIPO_INGRESO.SALIDA) {
                    const monitoreoResponse = await rndcConectionService.createRegistroMonitoreo(resultado.data);
                    xmlResponses.push({ data: monitoreoResponse.data });
                } else {
                    xmlResponses.push({ data: responseXML.data });
                }

            }

            return { statusCode: 200, data: [resultados, xmlResponses] };

        } catch (error) {
            console.error('Error en puntosCercanosPorViaje:', error.message);
            return { statusCode: 500, error: error.message };
        }
    },
    async generarEntrada(punto, coordenadas) {
        try {

            const validarCoordenadas = await this.validarCoordenadasGPS(punto, coordenadas)
            if (!validarCoordenadas.success) return validarCoordenadas;
            
            let masCercano = turfUtils.getNearestPoint(punto, coordenadas.data);
            if (!masCercano.success) {
                console.error('Error al obtener el punto más cercano:', masCercano.message);
                return { success: false, message: masCercano.message };
            }

            masCercano = masCercano.data;
            if (masCercano.properties.distanceToPoint > 1) {
                const intentos = punto.intentos_con_tracks ? punto.intentos_con_tracks + 1 : 1;

                DbConfig.executeQuery(`UPDATE rndc_puntos_control SET intentos_con_tracks = ?, ult_intento_con_tracks = ?, Fecha_ult_intento = ? WHERE id_punto = ?`, [intentos, JSON.stringify(masCercano.geometry.coordinates), new Date(), punto.id_punto]);
                return { success: false, message: 'No se encontro punto de entrada registrada' };

            }

            const fecha_llegada = coordenadas.data[masCercano.properties.featureIndex].fecha_track;
        
            DbConfig.executeQuery(`UPDATE rndc_puntos_control SET estado = 1, fecha_llegada = ?, Fecha_ult_intento = ?, intentos_con_tracks=0, intentos_sin_tracks = 0 WHERE id_punto = ?`, [new Date(fecha_llegada), new Date(), punto.id_punto]);
            punto.fecha_salida = fecha_salida;
            return { success: true, message: 'Salida registrada', data: punto };

        } catch (error) {
            console.error('Error en generarEntrada:', error.message);
            return { success: false, error: error.message };
        }
    },

    async generarSalida(punto, coordenadas) {
        try {

            const validarCoordenadas = await this.validarCoordenadasGPS(punto, coordenadas)
            if (!validarCoordenadas.success) return validarCoordenadas;

            const puntolat = parseFloat(punto.latitud);
            const puntolon = parseFloat(punto.longitud);

            if (isNaN(puntolat) || isNaN(puntolon)) {
                console.error('Coordenadas del punto de control inválidas:', punto.latitud, punto.longitud);
                return { success: false, message: 'Coordenadas del punto de control inválidas' };
            }

            const puntoControl = turf.point([puntolon, puntolat]);

            const datafiltered = coordenadas.data.filter(coord => (coord.fecha_track > punto.fecha_llegada && turf.distance(turf.point([coord.longitud, coord.latitud]), puntoControl) >= 1));
            const puntos = datafiltered.map(coord => { return turf.point([coord.longitud, coord.latitud]) });

            if (!datafiltered || datafiltered.length <= 0) {
                const intentos = punto.intentos_con_tracks ? punto.intentos_con_tracks + 1 : 1;
                DbConfig.executeQuery(`UPDATE rndc_puntos_control SET intentos_con_tracks = ?, ult_intento_con_tracks = ?, Fecha_ult_intento = ? WHERE id_punto = ?`, [intentos, JSON.stringify(puntos[0].geometry.coordinates), new Date(), punto.id_punto]);

                return { success: false, message: 'No se encontró punto de salida' };
            }

            const fecha_salida = datafiltered[0].fecha_track;
            DbConfig.executeQuery(`UPDATE rndc_puntos_control SET estado = 2, fecha_salida = ?, Fecha_ult_intento = ?, intentos_con_tracks=0, intentos_sin_tracks = 0 WHERE id_punto = ?`, [new Date(fecha_salida), new Date(), punto.id_punto]);

            punto.fecha_salida = fecha_salida;
            return { success: true, message: 'Salida registrada', data: punto };

        } catch (error) {
            console.error('Error en generarSalida:', error.message);
            return { success: false, error: error.message };
        }
    },
    obtenerPuntosDeCargueDescargue(puntos) {
        try {
            let i = 0;
            const puntosCargueYDescargue = [];

            for (const punto of puntos) {
                if (punto.fecha_cita) puntosCargueYDescargue.push(punto.id_punto);
            }

            return { success: true, data: { puntosCargueYDescargue } };
        } catch (error) {
            console.error('Error en obtenerPuntosDeCargueDescargue:', error.message);
            return { success: false, error: error.message };
        }
    },
    generarXMLINJSON(manifiesto, puntoControlData, coordenadasData, tipo = TIPO_INGRESO.SALIDA) {
        const ROOT = {};
        const VERSION = "1.0";
        const ENCODING = "ISO-8859-1";
        ROOT.ACCESO = {
            USERNAME: "ISCALAJUL@GMAIL.COM",
            PASSWORD: "Julian2020*"
        };
        ROOT.SOLICITUD = {
            TIPO: 1,
            PROCESOID: 60
        }
        ROOT.VARIABLES = {
            NUMIDGPS: coordenadasData.imei,
            INGRESOIDMANIFIESTO: puntoControlData.id_viaje,
            CODPUNTOCONTROL: puntoControlData.id_punto,
            LATITUD: puntoControlData.latitud,
            LONGITUD: puntoControlData.longitud,
            PLACA: coordenadasData.placa,
            FECHALLEGADA: new Date(puntoControlData.fecha_llegada).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/'),
            HORALLEGADA: new Date(puntoControlData.fecha_llegada).toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            FECHASALIDA: new Date(puntoControlData.fecha_salida).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/'),
            HORASALIDA: new Date(puntoControlData.fecha_salida).toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        };
        if (tipo !== TIPO_INGRESO.SALIDA) {
            ROOT.VARIABLES.FECHAENTRADA = new Date(puntoControlData.fecha_llegada).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
            ROOT.VARIABLES.HORAENTRADA = new Date(puntoControlData.fecha_llegada).toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' });
            ROOT.VARIABLES.TIPOIDCONDUCTOR = manifiesto.cod_id_conductor;
            ROOT.VARIABLES.NUMIDCONDUCTOR = manifiesto.num_id_conductor;
        }
        // Lógica para llenar jsonResponse con los datos necesarios

        return { success: true, data: { VERSION, ENCODING, ROOT } };
    },

    verificarTiemposPuntosCargueDescargue(punto, coordenadas){
        try {
            // Obtengo la fecha de la cita y la fecha mas actualizada del gps
            const fechaCita = new Date(punto.fecha_cita);

            //Obtengo el punto mas cercano al punto de control
            const masCercano = turfUtils.getNearestPoint(punto, coordenadas);
            if (!masCercano.success) {
                console.error('Error al obtener el punto más cercano:', masCercano.message);
                return { success: false, message: masCercano.message };
            }

            const fechaActual = new Date(coordenadas[masCercano.data.properties.featureIndex].fecha_track);

            //Calcular la diferencia en dias entre las dos fechas
            const diffDays = dateUtils.getDiffDaysByDates(fechaCita, fechaActual)
            if(!diffDays.success) return { error: false, success: false, data: [], message: `Error al calcular la diferencia de días para el punto de control ID ${punto.id_punto}.` };
            
            //Verifico si la diferencia es mayor a 1 dias
            const diferenciaDias = diffDays.data;

            if(diferenciaDias >= 1) return { error: false, success: false, data: false, message: `El punto de control ID ${punto.id_punto} no cumple con el tiempo pactado. Diferencia de ${diferenciaDias} días.` };

            //Si todo esta bien, retorno el exito
            return { error: false, success: true, message: 'El punto de control cumple con el tiempo pactado.', data: true };
        }catch (error) {
            console.error('Error en validarCoordenadasGPS:', error.message);
            return { success: false, error: error.message };
        }
    },

    async validarCoordenadasGPS(punto, coordenadas) {
        try {
            if (!coordenadas.data || coordenadas.data.length <= 0) {
                const intentos = punto.intentos_sin_tracks ? punto.intentos_sin_tracks + 1 : 1;
                DbConfig.executeQuery(`UPDATE rndc_puntos_control SET intentos_sin_tracks = ?, ult_intento_sin_tracks = ?, Fecha_ult_intento = ? WHERE id_punto = ?`, [intentos, new Date(), new Date(), punto.id_punto]);

                if (intentos >= 5) {
                    return { success: false, message: `Cuidado, se han detectado múltiples ${intentos} intentos sin GPS` };
                }

                return { success: false, message: 'No hay coordenadas GPS disponibles' };
            }
            return { success: true, data: coordenadas.data };
        } catch (error) {
            console.error('Error en validarCoordenadasGPS:', error.message);
            return { success: false, error: error.message };
        }
    }

}


module.exports = { rndcService };