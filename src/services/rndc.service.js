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
const moment = require('moment-timezone');
const rndcPuntosControlRepository = require("../repository/rndc_puntos_control");
const rndcManifiestoRepository = require("../repository/rndc_manifiestos.repository");
const puntosControlService = require("./puntosControl.service");
const manifiestosService = require("./manifiestos.service");
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
            // Consulto los manifiestos activos a monitorear
            const manifiestos = await DbConfig.executeQuery(`SELECT * FROM rndc_consultas WHERE estado = 1`);

            if (!manifiestos.success) {
                console.error('Error consultando manifiestos:', manifiestos.error);
                return { statusCode: 200, message: 'Hubo un error al consultar los manifiestos', data: {} };
            }

            if (!manifiestos.data || manifiestos.data.length <= 0) {
                console.error('No hay manifiestos activos para procesar.');
                return { statusCode: 200, message: 'No hay manifiestos para procesar', data: {} };
            }

            // Recorro cada manifiesto
            for (const manifiesto of manifiestos.data) {

                // Consulto los puntos de control asociados al manifiesto
                const controlPoints = await DbConfig.executeQuery(`SELECT * FROM rndc_puntos_control WHERE id_viaje = ? and estado != 2`, [manifiesto.id_viaje]);

                if (!controlPoints.success) {
                    console.error('Error consultando puntos de control:', controlPoints.error);
                    continue;
                }

                //Si no tiene puntos de control a evaluar actualizo el estado del manifiesto
                if (!controlPoints.data || controlPoints.data.length <= 0) {
                    await DbConfig.executeQuery(`UPDATE rndc_consultas SET estado = 2 WHERE id_viaje = ?`, [manifiesto.id_viaje]);
                    continue;
                }

                //Obtengo los puntos de cargue y descargue
                const puntosParaCYD = this.obtenerPuntosDeCargueDescargue(controlPoints.data);

                if (!puntosParaCYD.success) {
                    console.error('Error obteniendo puntos de cargue/descargue:', puntosParaCYD.error);
                    continue;
                }

                const { puntosCargueYDescargue } = puntosParaCYD.data;
                const fecha_ult_track = moment.utc().toDate();

                // Recorro cada punto de control
                for (const punto of controlPoints.data) {
                    // Consulto las coordenadas GPS asociadas al viaje y posteriores a la ultima fecha registrada
                    let query = `SELECT * FROM track_trailer WHERE id_viaje = ? ORDER BY fecha_track ASC`;
                    const variablesQuery = [punto.id_viaje];

                    if (punto.fecha_ult_track) {
                        query = `SELECT * FROM track_trailer WHERE id_viaje = ? AND fecha_track > ? ORDER BY fecha_track ASC`;
                        variablesQuery.push(punto.fecha_ult_track);
                    }

                    const coordenadas = await DbConfig.executeQuery(query, variablesQuery);
                    if (!coordenadas.success) {
                        console.error('Error consultando coordenadas GPS:', coordenadas.error);
                        continue;
                    }

                    //Si el punto de control ya fue evaluado lo saltamos
                    if (punto.estado == 2) continue;

                    //Si no hay coordenadas nuevas aumento el contador de intentos sin tracks
                    if (coordenadas.data.length <= 0) {
                        const intentos = punto.intentos_sin_tracks ? punto.intentos_sin_tracks + 1 : 1;
                        await DbConfig.executeQuery(`UPDATE rndc_puntos_control SET intentos_sin_tracks = ? WHERE id_punto = ?`, [intentos, punto.id_punto]);

                        //Si la cantidad de intentos es mayor a 10, envio una novedad a la RNDC
                        if (intentos >= 10) {
                            const reporteNovedad = await rndcConectionService.reportarNovedadRndc({
                                NUMIDGPS: manifiesto.empresa_monitoreo,
                                INGRESOIDMANIFIESTO: punto.id_viaje,
                                CODPUNTOCONTROL: punto.id_punto,
                                NUMPLACA: manifiesto.placa_vehiculo,
                            }, 4);

                            if (!reporteNovedad || !reporteNovedad.success) {
                                console.error('Error reportando novedad a RNDC para el punto de control ID:', punto.id_punto);
                                continue;
                            }
                        }
                        //Si la cantidad de intentos es mayor a 5, envio una notificacion interna
                        else if (intentos >= 5) {
                            console.log("Reporte interno a la empresa de monitoreo de flota")
                        }
                        continue;
                    }

                    const fecha = await DbConfig.executeQuery(`UPDATE rndc_puntos_control SET fecha_ult_track = ? WHERE id_punto = ?`, [fecha_ult_track, punto.id_punto]);

                    //Verifico que los puntos de cargue y descargue cumplan con los tiempos pactados
                    if (punto.fecha_cita && punto.estado == 0) {
                        const puntosCargueDescargueValidos = this.verificarTiemposPuntosCargueDescargue(punto, coordenadas.data);

                        //Si no cumple con los tiempos, se tiene que enviar un reporte de novedad a RNDC
                        if (!puntosCargueDescargueValidos.data) {
                            const reporteNovedad = await rndcConectionService.reportarNovedadRndc({
                                NUMIDGPS: manifiesto.empresa_monitoreo,
                                INGRESOIDMANIFIESTO: punto.id_viaje,
                                CODPUNTOCONTROL: punto.id_punto,
                                NUMPLACA: manifiesto.placa_vehiculo,
                            }, 1);

                            //resultados.push({ tipo: 'novedad', data: reporteNovedad.data });

                            if (!reporteNovedad || !reporteNovedad.success) {
                                console.error('Error reportando novedad a RNDC para el punto de control ID:', punto.id_punto);
                                continue;
                            }
                        }
                    }

                    //Si el punto esta en estado 0, generamos la entrada del vehiculo
                    if (punto.estado == 0) {
                        const generarEntrada = await this.generarEntrada(punto, coordenadas);
                        if (generarEntrada.error || !generarEntrada.success) continue;
                    }

                    // Si el punto esta en estado 1, generamos la salida del vehiculo
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

    /**
     * Genera el registro de entrada de un vehículo en un punto de control.
     * Valida las coordenadas GPS y actualiza el estado del punto a "en tránsito".
     * @async
     * @function generarEntrada
     * @param {Object} punto - Datos del punto de control
     * @param {number} punto.id_punto - ID único del punto de control
     * @param {string|number} punto.latitud - Coordenada de latitud del punto
     * @param {string|number} punto.longitud - Coordenada de longitud del punto
     * @param {number} [punto.intentos_con_tracks] - Número de intentos previos con coordenadas
     * @param {Object} coordenadas - Objeto con coordenadas GPS disponibles
     * @param {Array} coordenadas.data - Array de coordenadas GPS con timestamp
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Object} [returns.data] - Datos del punto actualizado con fecha de llegada
     * @throws {Error} Error de base de datos o validación de coordenadas
     * @example
     * const punto = {
     *   id_punto: 123,
     *   latitud: "4.5981",
     *   longitud: "-74.0758"
     * };
     * 
     * const coordenadas = {
     *   data: [
     *     { latitud: 4.5982, longitud: -74.0759, fecha_track: "2024-01-15T10:30:00Z" },
     *     { latitud: 4.5980, longitud: -74.0757, fecha_track: "2024-01-15T10:31:00Z" }
     *   ]
     * };
     * 
     * const resultado = await rndcService.generarEntrada(punto, coordenadas);
     * 
     * if (resultado.success) {
     *   console.log("Entrada registrada:", resultado.data.fecha_llegada);
     * } else {
     *   console.error("Error:", resultado.message);
     * }
     */
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

                await DbConfig.executeQuery(`UPDATE rndc_puntos_control SET intentos_con_tracks = ?, ult_intento_con_tracks = ?, Fecha_ult_intento = ? WHERE id_punto = ?`, [intentos, JSON.stringify(masCercano.geometry.coordinates), moment.utc().toDate(), punto.id_punto]);
                return { success: false, message: 'No se encontro punto de entrada registrada' };

            }

            const fecha_llegada = coordenadas.data[masCercano.properties.featureIndex].fecha_track;
            punto.fecha_llegada = moment.utc(fecha_llegada).toDate();
            punto.estado = 1;

            const result = await DbConfig.executeQuery(`UPDATE rndc_puntos_control SET estado = 1, fecha_llegada = ?, Fecha_ult_intento = ?, intentos_con_tracks=0, intentos_sin_tracks = 0 WHERE id_punto = ?`, [punto.fecha_llegada, moment.utc().toDate(), punto.id_punto]);
            return { success: true, message: 'Salida registrada', data: punto };

        } catch (error) {
            console.error('Error en generarEntrada:', error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Genera el registro de salida de un vehículo de un punto de control.
     * Filtra coordenadas posteriores a la llegada y determina el punto de salida.
     * @async
     * @function generarSalida
     * @param {Object} punto - Datos del punto de control
     * @param {number} punto.id_punto - ID único del punto de control
     * @param {string|number} punto.latitud - Coordenada de latitud del punto
     * @param {string|number} punto.longitud - Coordenada de longitud del punto
     * @param {Date} punto.fecha_llegada - Fecha y hora de llegada al punto
     * @param {number} [punto.intentos_con_tracks] - Número de intentos previos con coordenadas
     * @param {Object} coordenadas - Objeto con coordenadas GPS disponibles
     * @param {Array} coordenadas.data - Array de coordenadas GPS con timestamp
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Object} [returns.data] - Datos del punto actualizado con fecha de salida
     * @throws {Error} Error de base de datos, coordenadas inválidas o cálculos geoespaciales
     * @example
     * const punto = {
     *   id_punto: 123,
     *   latitud: "4.5981",
     *   longitud: "-74.0758",
     *   fecha_llegada: new Date("2024-01-15T10:30:00Z")
     * };
     * 
     * const coordenadas = {
     *   data: [
     *     { latitud: 4.5982, longitud: -74.0759, fecha_track: "2024-01-15T10:35:00Z" },
     *     { latitud: 4.6000, longitud: -74.0800, fecha_track: "2024-01-15T11:00:00Z" } // > 1km de distancia
     *   ]
     * };
     * 
     * const resultado = await rndcService.generarSalida(punto, coordenadas);
     * 
     * if (resultado.success) {
     *   console.log("Salida registrada:", resultado.data.fecha_salida);
     * } else {
     *   console.error("Error:", resultado.message);
     * }
     */
    async generarSalida(punto, coordenadas) {
        try {

            const coordenadasValidasFecha = {};
            coordenadasValidasFecha.data = coordenadas.data.filter(coord => (coord.fecha_track > punto.fecha_llegada));
            const validarCoordenadas = await this.validarCoordenadasGPS(punto, coordenadasValidasFecha);
            if (!validarCoordenadas.success) return validarCoordenadas;

            const puntolat = parseFloat(punto.latitud);
            const puntolon = parseFloat(punto.longitud);

            if (isNaN(puntolat) || isNaN(puntolon)) {
                console.error('Coordenadas del punto de control inválidas:', punto.latitud, punto.longitud);
                return { success: false, message: 'Coordenadas del punto de control inválidas' };
            }

            const puntoControl = turf.point([puntolon, puntolat]);
            const coordenadasValidasDistancia = coordenadas.data.filter(coord => (coord.fecha_track > punto.fecha_llegada && turf.distance(turf.point([coord.longitud, coord.latitud]), puntoControl) >= 1));
            const puntos = coordenadasValidasDistancia.map(coord => { return turf.point([coord.longitud, coord.latitud]) });

            if (!coordenadasValidasDistancia || coordenadasValidasDistancia.length <= 0) {

                const intentos = punto.intentos_con_tracks ? punto.intentos_con_tracks + 1 : 1;
                const ultimoPunto = turf.point([coordenadasValidasFecha.data[coordenadasValidasFecha.data.length - 1].longitud, coordenadasValidasFecha.data[coordenadasValidasFecha.data.length - 1].latitud]);
                await DbConfig.executeQuery(`UPDATE rndc_puntos_control SET intentos_con_tracks = ?, ult_intento_con_tracks = ?, Fecha_ult_intento = ? WHERE id_punto = ?`, [intentos, JSON.stringify(ultimoPunto.geometry.coordinates), moment.utc().toDate(), punto.id_punto]);

                return { success: false, message: 'No se encontró punto de salida' };
            }

            const fecha_salida = coordenadasValidasDistancia[0].fecha_track;
            await DbConfig.executeQuery(`UPDATE rndc_puntos_control SET estado = 2, fecha_salida = ?, Fecha_ult_intento = ?, intentos_con_tracks=0, intentos_sin_tracks = 0 WHERE id_punto = ?`, [moment.utc(fecha_salida).toDate(), moment.utc().toDate(), punto.id_punto]);

            punto.fecha_salida = fecha_salida;
            punto.estado = 1;

            return { success: true, message: 'Salida registrada', data: punto };

        } catch (error) {
            console.error('Error en generarSalida:', error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Identifica los puntos de cargue y descargue basándose en la presencia de fecha de cita.
     * Los puntos con fecha de cita se consideran puntos de cargue/descargue según normativa RNDC.
     * @function obtenerPuntosDeCargueDescargue
     * @param {Array<Object>} puntos - Array de puntos de control
     * @param {number} puntos[].id_punto - ID único del punto de control
     * @param {Date|string} [puntos[].fecha_cita] - Fecha de cita programada (indica cargue/descargue)
     * @returns {Object} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {Object} returns.data - Datos procesados
     * @returns {Array<number>} returns.data.puntosCargueYDescargue - IDs de puntos que son cargue/descargue
     * @example
     * const puntos = [
     *   { id_punto: 1, fecha_cita: "2024-01-15T10:00:00Z" }, // Cargue/Descargue
     *   { id_punto: 2, fecha_cita: null },                    // Punto de tránsito
     *   { id_punto: 3, fecha_cita: "2024-01-16T08:00:00Z" }  // Cargue/Descargue
     * ];
     * 
     * const resultado = rndcService.obtenerPuntosDeCargueDescargue(puntos);
     * 
     * if (resultado.success) {
     *   console.log("Puntos de cargue/descargue:", resultado.data.puntosCargueYDescargue);
     *   // Output: [1, 3]
     * }
     */
    obtenerPuntosDeCargueDescargue(puntos) {
        try {
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

    /**
     * Genera la estructura XML en formato JSON para envío a RNDC.
     * Crea el payload necesario para registros de monitoreo, cargue o descargue.
     * @function generarXMLINJSON
     * @param {Object} manifiesto - Datos del manifiesto
     * @param {string|number} manifiesto.empresa_monitoreo - ID de la empresa de monitoreo GPS
     * @param {string} [manifiesto.cod_id_conductor] - Código tipo identificación conductor
     * @param {string} [manifiesto.num_id_conductor] - Número identificación conductor
     * @param {Object} puntoControlData - Datos del punto de control procesado
     * @param {number} puntoControlData.id_viaje - ID del viaje/manifiesto
     * @param {number} puntoControlData.id_punto - ID del punto de control
     * @param {string|number} puntoControlData.latitud - Coordenada de latitud
     * @param {string|number} puntoControlData.longitud - Coordenada de longitud
     * @param {Date} puntoControlData.fecha_llegada - Fecha y hora de llegada
     * @param {Date} puntoControlData.fecha_salida - Fecha y hora de salida
     * @param {Object} coordenadasData - Datos de coordenadas GPS
     * @param {string} coordenadasData.placa - Placa del vehículo
     * @param {string} [tipo=TIPO_INGRESO.SALIDA] - Tipo de registro (salida|cargue|descargue)
     * @returns {Object} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {Object} returns.data - Estructura XML en formato JSON
     * @returns {string} returns.data.VERSION - Versión del XML
     * @returns {string} returns.data.ENCODING - Codificación del XML
     * @returns {Object} returns.data.ROOT - Elemento raíz con acceso, solicitud y variables
     * @example
     * const manifiesto = {
     *   empresa_monitoreo: "123456",
     *   cod_id_conductor: "1",
     *   num_id_conductor: "12345678"
     * };
     * 
     * const puntoData = {
     *   id_viaje: 789,
     *   id_punto: 1,
     *   latitud: "4.5981",
     *   longitud: "-74.0758",
     *   fecha_llegada: new Date("2024-01-15T10:30:00Z"),
     *   fecha_salida: new Date("2024-01-15T11:00:00Z")
     * };
     * 
     * const coordenadas = { placa: "ABC123" };
     * 
     * const resultado = rndcService.generarXMLINJSON(manifiesto, puntoData, coordenadas, "cargue");
     * 
     * if (resultado.success) {
     *   console.log("XML generado:", resultado.data.ROOT.VARIABLES);
     * }
     */
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
            NUMIDGPS: manifiesto.empresa_monitoreo,
            INGRESOIDMANIFIESTO: puntoControlData.id_viaje,
            CODPUNTOCONTROL: puntoControlData.id_punto,
            LATITUD: puntoControlData.latitud,
            LONGITUD: puntoControlData.longitud,
            PLACA: coordenadasData.placa,
            FECHALLEGADA: moment.utc(puntoControlData.fecha_llegada).format('DD/MM/YYYY'),
            HORALLEGADA: moment.utc(puntoControlData.fecha_llegada).format('HH:mm'),
            FECHASALIDA: moment.utc(puntoControlData.fecha_salida).format('DD/MM/YYYY'),
            HORASALIDA: moment.utc(puntoControlData.fecha_salida).format('HH:mm'),
        };
        if (tipo !== TIPO_INGRESO.SALIDA) {
            ROOT.VARIABLES.FECHAENTRADA = moment.utc(puntoControlData.fecha_llegada).format('DD/MM/YYYY');
            ROOT.VARIABLES.HORAENTRADA = moment.utc(puntoControlData.fecha_llegada).format('HH:mm');
            ROOT.VARIABLES.TIPOIDCONDUCTOR = manifiesto.cod_id_conductor;
            ROOT.VARIABLES.NUMIDCONDUCTOR = manifiesto.num_id_conductor;
        }
        // Lógica para llenar jsonResponse con los datos necesarios

        return { success: true, data: { VERSION, ENCODING, ROOT } };
    },

    /**
     * Verifica si un vehículo cumple con los tiempos pactados en puntos de cargue/descargue.
     * Compara la fecha de cita programada con la fecha real de llegada según GPS.
     * @function verificarTiemposPuntosCargueDescargue
     * @param {Object} punto - Datos del punto de control
     * @param {number} punto.id_punto - ID único del punto de control
     * @param {Date|string} punto.fecha_cita - Fecha y hora pactada para la cita
     * @param {string|number} punto.latitud - Coordenada de latitud del punto
     * @param {string|number} punto.longitud - Coordenada de longitud del punto
     * @param {Array} coordenadas - Array de coordenadas GPS disponibles
     * @param {number} coordenadas[].latitud - Latitud de la coordenada GPS
     * @param {number} coordenadas[].longitud - Longitud de la coordenada GPS
     * @param {Date|string} coordenadas[].fecha_track - Timestamp de la coordenada GPS
     * @returns {Object} Resultado de la verificación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {boolean} [returns.error] - Indica si hubo error en el proceso
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {boolean} returns.data - true si cumple tiempos, false si no cumple
     * @example
     * const punto = {
     *   id_punto: 123,
     *   fecha_cita: new Date("2024-01-15T10:00:00Z"),
     *   latitud: "4.5981",
     *   longitud: "-74.0758"
     * };
     * 
     * const coordenadas = [
     *   { latitud: 4.5982, longitud: -74.0759, fecha_track: "2024-01-15T09:30:00Z" }, // Llegada temprana
     *   { latitud: 4.5980, longitud: -74.0757, fecha_track: "2024-01-16T11:00:00Z" }  // Llegada tardía
     * ];
     * 
     * const resultado = rndcService.verificarTiemposPuntosCargueDescargue(punto, coordenadas);
     * 
     * if (resultado.success) {
     *   if (resultado.data) {
     *     console.log("Cumple con los tiempos pactados");
     *   } else {
     *     console.log("No cumple con los tiempos:", resultado.message);
     *   }
     * }
     */
    verificarTiemposPuntosCargueDescargue(punto, coordenadas) {
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
            if (!diffDays.success) return { error: false, success: false, data: [], message: `Error al calcular la diferencia de días para el punto de control ID ${punto.id_punto}.` };

            //Verifico si la diferencia es mayor a 1 dias
            const diferenciaDias = diffDays.data;

            if (fechaActual <= fechaCita) return { error: false, success: true, data: true, message: 'El punto de control cumple con el tiempo pactado.' };
            if (fechaActual > fechaCita && diferenciaDias >= 1) return { error: false, success: false, data: false, message: `El punto de control ID ${punto.id_punto} no cumple con el tiempo pactado. Diferencia de ${diferenciaDias} días.` };

            //Si todo esta bien, retorno el exito
            return { error: false, success: true, message: 'El punto de control cumple con el tiempo pactado.', data: true };
        } catch (error) {
            console.error('Error en validarCoordenadasGPS:', error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Valida la disponibilidad y calidad de coordenadas GPS para un punto de control.
     * Actualiza contadores de intentos y genera alertas según el número de fallos.
     * @async
     * @function validarCoordenadasGPS
     * @param {Object} punto - Datos del punto de control
     * @param {number} punto.id_punto - ID único del punto de control
     * @param {number} [punto.intentos_sin_tracks] - Número de intentos previos sin coordenadas
     * @param {Object} coordenadas - Objeto con coordenadas GPS
     * @param {Array} coordenadas.data - Array de coordenadas GPS disponibles
     * @returns {Promise<Object>} Resultado de la validación
     * @returns {boolean} returns.success - Indica si hay coordenadas válidas disponibles
     * @returns {string} [returns.error] - Mensaje de error si la validación falló
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Array} [returns.data] - Array de coordenadas válidas si las hay
     * @throws {Error} Error de base de datos al actualizar contadores
     * @example
     * const punto = {
     *   id_punto: 123,
     *   intentos_sin_tracks: 2
     * };
     * 
     * const coordenadas = {
     *   data: [
     *     { latitud: 4.5981, longitud: -74.0758, fecha_track: "2024-01-15T10:30:00Z" }
     *   ]
     * };
     * 
     * const resultado = await rndcService.validarCoordenadasGPS(punto, coordenadas);
     * 
     * if (resultado.success) {
     *   console.log("Coordenadas válidas:", resultado.data.length);
     * } else {
     *   console.warn("Sin coordenadas:", resultado.message);
     * }
     * 
     * // Caso sin coordenadas
     * const coordenadasVacias = { data: [] };
     * const resultado2 = await rndcService.validarCoordenadasGPS(punto, coordenadasVacias);
     * // Incrementará intentos_sin_tracks y mostrará alerta si >= 5
     */
    async validarCoordenadasGPS(punto, coordenadas) {
        try {
            if (!coordenadas.data || coordenadas.data.length <= 0) {
                const intentos = punto.intentos_sin_tracks ? punto.intentos_sin_tracks + 1 : 1;
                DbConfig.executeQuery(`UPDATE rndc_puntos_control SET intentos_sin_tracks = ?, ult_intento_sin_tracks = ?, Fecha_ult_intento = ? WHERE id_punto = ?`, [intentos, moment.utc().toDate(), moment.utc().toDate(), punto.id_punto]);

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
    },

    /**
     * Sincroniza manifiestos y puntos de control recibidos desde la API de RNDC.
     * Procesa manifiestos EMF y aplica creaciones o ajustes según corresponda.
     * @async
     * @function sincronizarRegistrosRNDC
     * @param {Array<string>} manifiestosEMF - Array de IDs de manifiestos a consultar
     * @returns {Promise<Object>} Resultado de la sincronización
     * @returns {boolean} [returns.success] - Indica si la operación fue exitosa
     * @returns {number} [returns.statusCode] - Código de estado HTTP de la respuesta
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Object} returns.data - Datos del resultado
     * @returns {Array<string>} returns.data.ERRORS - Array de errores encontrados durante el procesamiento
     * @throws {Error} Error de conexión con RNDC o base de datos
     * @example
     * const manifiestos = ["123456789", "987654321", "456789123"];
     * 
     * const resultado = await rndcService.sincronizarRegistrosRNDC(manifiestos);
     * 
     * if (resultado.statusCode === 200) {
     *   console.log("Sincronización completada:", resultado.message);
     *   
     *   if (resultado.data.ERRORS.length > 0) {
     *     console.log("Errores encontrados:");
     *     resultado.data.ERRORS.forEach(error => console.log("- ", error));
     *   } else {
     *     console.log("Todos los manifiestos se procesaron correctamente");
     *   }
     * } else {
     *   console.error("Error en sincronización:", resultado.error);
     * }
     * 
     * // Procesar resultado con validación
     * const procesarSincronizacion = async (manifestosIds) => {
     *   const resultado = await rndcService.sincronizarRegistrosRNDC(manifestosIds);
     *   
     *   const exitosos = manifestosIds.length - resultado.data.ERRORS.length;
     *   console.log(`Procesados: ${exitosos}/${manifestosIds.length} manifiestos`);
     *   
     *   return resultado.data.ERRORS.length === 0;
     * };
     */
    async sincronizarRegistrosRNDC(manifiestosEMF) {
        try {

            const manifiestosParaEMF = await rndcConectionService.consultarManifiestosPrueba(manifiestosEMF);
            if (!manifiestosParaEMF.success) {
                console.error('Error consultando manifiestos para EMF:', manifiestosParaEMF.error);
                return { success: false, error: manifiestosParaEMF.error, data: [] };
            }

            let manifiestosArray = [];
            if (!Array.isArray(manifiestosParaEMF.data.root.documento)) manifiestosArray = [manifiestosParaEMF.data.root.documento];
            else manifiestosArray = manifiestosParaEMF.data.root.documento;

            const ERRORS = [];

            for (const data of manifiestosArray) {

                const procesarManifiesto = await manifiestosService.procesarManifiesto(data);
                if (procesarManifiesto.errors) ERRORS.push(...procesarManifiesto.errors);


                if (!data.puntoscontrol || !data.puntoscontrol.puntocontrol || data.puntoscontrol.puntocontrol.length <= 0 || (data.ajuste && (data.ajuste == 4 || data.ajuste == 5))) {
                    console.log(`El manifiesto ${data.ingresoidmanifiesto} no tiene puntos de control.`);
                    continue;
                }

                const procesarPuntosControl = await puntosControlService.procesarPuntosControl(data.ingresoidmanifiesto, data.puntoscontrol.puntocontrol);
                if (!procesarPuntosControl.success) return procesarPuntosControl;

                if (procesarPuntosControl.errors) ERRORS.push(...procesarPuntosControl.errors);

            }

            return { statusCode: 200, message: 'Manifiestos EMF actualizados', data: { ERRORS } };
        } catch (error) {
            console.error('Error en actualizarManifiestosEMF:', error.message);
            return { success: false, error: error.message, data: [] };
        }
    },

    /**
     * Reporta novedades o incidencias a la plataforma RNDC.
     * Transforma datos internos al formato requerido por RNDC y envía el reporte.
     * @async
     * @function reportarNovedadRndc
     * @param {Object} data - Datos de la novedad a reportar
     * @param {string|number} data.id_gps - ID del dispositivo GPS/empresa monitoreo
     * @param {string|number} data.manifiesto - Número del manifiesto asociado
     * @param {string|number} data.punto_control - Código del punto de control
     * @param {string} data.placa - Placa del vehículo involucrado
     * @param {number} tipo - Tipo de novedad según clasificación RNDC
     * @param {number} tipo.1 - Retraso en tiempo pactado
     * @param {number} tipo.2 - Cambio de ruta no autorizado
     * @param {number} tipo.3 - Falla en dispositivo GPS
     * @param {number} tipo.4 - Ausencia de señal GPS prolongada
     * @param {number} tipo.5 - Otras novedades operativas
     * @returns {Promise<Object>} Resultado del reporte
     * @returns {boolean} returns.success - Indica si el reporte fue exitoso
     * @returns {string} [returns.error] - Mensaje de error si el reporte falló
     * @returns {Array|Object} returns.data - Respuesta de la plataforma RNDC
     * @throws {Error} Error de conexión con RNDC o validación de datos
     * @example
     * // Reportar retraso en tiempo pactado
     * const novedadRetraso = {
     *   id_gps: "123456",
     *   manifiesto: "789012345",
     *   punto_control: "001",
     *   placa: "ABC123"
     * };
     * 
     * const resultado = await rndcService.reportarNovedadRndc(novedadRetraso, 1);
     * 
     * if (resultado.success) {
     *   console.log("Novedad reportada exitosamente a RNDC");
     * } else {
     *   console.error("Error reportando novedad:", resultado.error);
     * }
     * 
     * // Reportar falla de GPS
     * const novedadGPS = {
     *   id_gps: "123456",
     *   manifiesto: "789012345", 
     *   punto_control: "002",
     *   placa: "XYZ789"
     * };
     * 
     * const resultado2 = await rndcService.reportarNovedadRndc(novedadGPS, 4);
     * 
     * // Procesar múltiples novedades
     * const reportarMultiplesNovedades = async (novedades) => {
     *   const resultados = [];
     *   
     *   for (const novedad of novedades) {
     *     const resultado = await rndcService.reportarNovedadRndc(novedad.data, novedad.tipo);
     *     resultados.push({ ...novedad, resultado });
     *   }
     *   
     *   const exitosos = resultados.filter(r => r.resultado.success).length;
     *   console.log(`Reportes exitosos: ${exitosos}/${resultados.length}`);
     *   
     *   return resultados;
     * };
     */
    async reportarNovedadRndc(data, tipo) {
        try {
            const novedad_data = {
                NUMIDGPS: data.id_gps,
                INGRESOIDMANIFIESTO: data.manifiesto,
                CODPUNTOCONTROL: data.punto_control,
                NUMPLACA: data.placa,
            }
            const response = await rndcConectionService.reportarNovedadRndc(novedad_data, tipo);
            return response;
        } catch (error) {
            console.error('Error en reportarNovedadRndc:', error.message);
            return { success: false, error: error.message, data: [] };
        }
    },


}


module.exports = { rndcService };