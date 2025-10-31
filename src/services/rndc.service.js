const turf = require("@turf/turf");
const DbConfig = require("../config/db");


const rndcService = {
    /**
* Encuentra los puntos GPS más cercanos a cada punto de control por viaje.
* @param {Array} gpsPoints - Lista de puntos GPS [{ latitud, longitud, id_viaje }]
* @param {Array} controlPoints - Lista de puntos de control [{ latitud, longitud, id_consulta }]
* @param {Array} trips - Lista de viajes [{ id_consulta }]
* @returns {Array} Lista de coincidencias [{ viaje_id, punto_control_id, gps_id, distancia_m }]
*/
    async puntosCercanosPorViaje() {
        const resultados = [];
        try {
            // Si no se proporcionan datos, consultar desde la base de datos

            const controlPoints = await DbConfig.executeQuery(`SELECT * FROM rndc_puntos_control WHERE estado != 2`);
            if (!controlPoints.success) {
                console.error('Error consultando puntos de control:', controlPoints.error);
            }

            for (const punto of controlPoints.data) {

                const coordenadas = await DbConfig.executeQuery(`SELECT * FROM track_trailer WHERE id_viaje = ? ORDER BY dia_hora ASC`, [punto.id_consulta]);

                if (!coordenadas.success) {
                    console.error('Error consultando coordenadas GPS:', coordenadas.error);
                    continue;
                }

                if (punto.estado == 0) await this.generarEntrada(punto, coordenadas);

                if (punto.estado == 1) {
                    const generarSalida = await this.generarSalida(punto, coordenadas);

                    console.log('Generar salida result:', generarSalida);


                    if (generarSalida && generarSalida.success) {
                        console.log('Generando XML/JSON para punto:', punto);

                        const xmlJson = this.generarXMLINJSON(generarSalida.data, coordenadas.data[0]);
                        resultados.push(xmlJson.data)
                    }
                }

                //crear el xml con la informacion
            }

            return resultados;

        } catch (error) {
            console.error('Error en puntosCercanosPorViaje:', error.message);
            return [];
        }
    },
    async generarEntrada(punto, coordenadas) {
        try {

            const puntolat = parseFloat(punto.latitud);
            const puntolon = parseFloat(punto.longitud);

            if (isNaN(puntolat) || isNaN(puntolon)) {
                console.error('Coordenadas del punto de control inválidas:', punto.latitud, punto.longitud);
                return { success: false, message: 'Coordenadas del punto de control inválidas' };
            }

            if (!coordenadas.data || coordenadas.data.length <= 0) {
                return { success: false, message: 'No hay coordenadas GPS disponibles' };
            }

            const puntoControl = turf.point([puntolon, puntolat]);

            const puntos = coordenadas.data.map(coord => { return turf.point([coord.longitud, coord.latitud]) });

            const masCercano = turf.nearestPoint(puntoControl, turf.featureCollection(puntos));

            if (masCercano.properties.distanceToPoint > 1) {
                const intentos = punto.intentos ? punto.intentos + 1 : 1;
                console.log('Incrementando intentos a:', intentos);
                console.log('Ultimo intento:', new Date());
                DbConfig.executeQuery(`UPDATE rndc_puntos_control SET intentos = ?, ult_intento = ? WHERE id_punto = ?`, [intentos, masCercano.properties.distanceToPoint, punto.id_punto]);
                return { success: false, message: 'No se encontro punto de entrada registrada' };

            }

            const fecha_llegada = coordenadas.data[masCercano.properties.featureIndex].dia_hora;
            console.log('Fecha llegada:', fecha_llegada);
            DbConfig.executeQuery(`UPDATE rndc_puntos_control SET estado = 1, fecha_llegada = ? WHERE id_punto = ?`, [new Date(fecha_llegada), punto.id_punto]);
            return { success: true, message: 'Salida registrada' };

        } catch (error) {
            console.error('Error en generarEntrada:', error.message);
            return { success: false, error: error.message };
        }
    },
    async generarSalida(punto, coordenadas) {
        try {

            const puntolat = parseFloat(punto.latitud);
            const puntolon = parseFloat(punto.longitud);

            if (isNaN(puntolat) || isNaN(puntolon)) {
                console.error('Coordenadas del punto de control inválidas:', punto.latitud, punto.longitud);
                return { success: false, message: 'Coordenadas del punto de control inválidas' };
            }

            if (!coordenadas.data || coordenadas.data.length <= 0) {
                return { success: false, message: 'No hay coordenadas GPS disponibles' };
            }

            const puntoControl = turf.point([puntolon, puntolat]);
            const datafiltered = coordenadas.data.filter(coord => (coord.dia_hora > punto.fecha_llegada && turf.distance(turf.point([coord.longitud, coord.latitud]), puntoControl) >= 1));
            const puntos = datafiltered.map(coord => { return turf.point([coord.longitud, coord.latitud]) });

            if (!puntos || puntos.length <= 0) {
                const intentos = punto.intentos ? punto.intentos + 1 : 1;
                DbConfig.executeQuery(`UPDATE rndc_puntos_control SET intentos = ?, ult_intento = ? WHERE id_punto = ?`, [intentos, masCercano.properties.distanceToPoint, punto.id_punto]);

                return { success: false, message: 'No se encontró punto de salida' };
            }

            const fecha_salida = datafiltered[0].dia_hora;
            DbConfig.executeQuery(`UPDATE rndc_puntos_control SET estado = 2, fecha_salida = ? WHERE id_punto = ?`, [new Date(fecha_salida), punto.id_punto]);

            punto.fecha_salida = fecha_salida;
            return { success: true, message: 'Salida registrada', data: punto };

        } catch (error) {
            console.error('Error en generarSalida:', error.message);
            return { success: false, error: error.message };
        }
    },

    generarXMLINJSON(puntoControlData, coordenadasData) {
        console.log('Generando XML/JSON con:', puntoControlData, coordenadasData);
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
            INGRESOIDMANIFIESTO: puntoControlData.id_consulta,
            CODPUNTOCONTROL: puntoControlData.id_punto,
            LATITUD: puntoControlData.latitud,
            LONGITUD: puntoControlData.longitud,
            PLACA: coordenadasData.placa,
            FECHALLEGADA: new Date(puntoControlData.fecha_llegada).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/'),
            HORALLEGADA: new Date(puntoControlData.fecha_llegada).toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            FECHASALIDA: new Date(puntoControlData.fecha_salida).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/'),
            HORASALIDA: new Date(puntoControlData.fecha_salida).toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' }),

        };
        // Lógica para llenar jsonResponse con los datos necesarios

        return { success: true, data: { VERSION, ENCODING, ROOT } };
    }
}


module.exports = { rndcService };