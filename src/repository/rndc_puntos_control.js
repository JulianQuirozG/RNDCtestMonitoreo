const DbConfig = require('../config/db');
const moment = require('moment-timezone');
const rndcManifiestoRepository = require('./rndc_manifiestos.repository');

const rndcPuntosControlRepository = {

    /**
     * Crea un nuevo punto de control asociado a un manifiesto RNDC.
     * Valida la existencia del manifiesto antes de crear el punto de control.
     * @async
     * @function createPuntosControl
     * @param {string|number} manifiestoId - ID del manifiesto (numero_manifiesto)
     * @param {Object} punto - Datos del punto de control a crear
     * @param {string|number} punto.codpuntocontrol - Código identificador del punto de control
     * @param {string|number} punto.latitud - Coordenada de latitud del punto
     * @param {string|number} punto.longitud - Coordenada de longitud del punto
     * @param {string} punto.fechacita - Fecha de la cita en formato string
     * @param {string} [punto.horacita] - Hora de la cita en formato HH:MM
     * @param {string|number} [punto.tiempopactado] - Tiempo pactado en minutos
     * @param {string} [punto.codmunicipio] - Código del municipio
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {string} [returns.message] - Mensaje descriptivo del resultado
     * @returns {Object|Array} returns.data - Datos del punto creado o array vacío en caso de error
     * @throws {Error} Error de base de datos o validación
     * @example
     * const puntoData = {
     *   codpuntocontrol: "1",
     *   latitud: "4.5981",
     *   longitud: "-74.0758",
     *   fechacita: "2024/01/15",
     *   horacita: "08:30",
     *   tiempopactado: "120",
     *   codmunicipio: "11001000"
     * };
     * 
     * const resultado = await rndcPuntosControlRepository.createPuntosControl("123456789", puntoData);
     * if (resultado.success) {
     *   console.log("Punto creado:", resultado.data);
     * }
     */
    async createPuntosControl(manifiestoId, punto) {
        try {

            const manifiestoIdDB = Number(manifiestoId);

            const manifiestoData = await rndcManifiestoRepository.getManifiestoByingresoidmanifiesto(manifiestoIdDB);
            if (!manifiestoData.success || manifiestoData.data.length === 0) return manifiestoData;
            let fecha_cita_str = punto.fechacita + ' ' + (punto.horacita || '00:00');
            const viaje_id = manifiestoData.data[0].id_viaje;
            const puntoId = Number(punto.codpuntocontrol);
            const latitud = punto.latitud;
            const longitud = punto.longitud;
            const fechaCita = moment.utc(fecha_cita_str, 'YYYY/MM/DD HH:mm').toDate();
            const estado = 0;
            const tiempopactado = punto.tiempopactado;
            const codmunicipio = punto.codmunicipio;

            const puntoControl = await DbConfig.executeQuery(`INSERT INTO rndc_puntos_control
            (id_viaje, id_punto, latitud, longitud, fecha_cita, tiempopactado, codmunicipio, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [viaje_id, puntoId, latitud, longitud, fechaCita, tiempopactado, codmunicipio, estado]);

            if (!puntoControl.success) return { success: false, error: 'Error inserting punto control', data: [] };


            return { success: true, message: 'Punto control created successfully', data: puntoControl };

        } catch (error) {
            console.error('Error in createPuntosControl repository:', error);
            return { success: false, error: true, message: 'Database error', data: [] };
        }
    },

    /**
     * Actualiza un punto de control o manifiesto aplicando un ajuste específico según los tipos RNDC.
     * Maneja 5 tipos de ajustes diferentes con sus respectivas actualizaciones en base de datos.
     * @async
     * @function actualizarAjuste
     * @param {string|number} manifiestoId - ID del manifiesto (numero_manifiesto)
     * @param {Object} punto - Datos del punto de control con información de ajuste
     * @param {string|number} punto.codpuntocontrol - Código identificador del punto de control
     * @param {number} punto.ajuste - Tipo de ajuste a aplicar (1-5)
     * @param {string|number} [punto.latitud] - Nueva coordenada de latitud (ajustes 2,3)
     * @param {string|number} [punto.longitud] - Nueva coordenada de longitud (ajustes 2,3)
     * @param {string} [punto.fechacita] - Nueva fecha de cita (ajustes 1,3)
     * @param {string} [punto.codmunicipio] - Nuevo código de municipio (ajustes 2,3)
     * @param {string|number} [punto.tiempopactado] - Tiempo pactado en minutos
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {string} [returns.message] - Mensaje descriptivo del resultado
     * @returns {Object|Array} returns.data - Datos de la actualización o array vacío en caso de error
     * @description Tipos de ajuste implementados:
     * - Ajuste 1: Cambio en la Fecha y Hora del Punto de Control
     * - Ajuste 2: Cambio en la Sede del Punto de Control
     * - Ajuste 3: Cambio en la Sede y fecha del punto de control
     * - Ajuste 4: Anulación del Manifiesto de Carga
     * - Ajuste 5: Transbordo NO Planeado
     * @throws {Error} Error de base de datos o validación
     * @example
     * // Cambiar fecha y hora (ajuste tipo 1)
     * const ajusteFecha = {
     *   codpuntocontrol: "1",
     *   ajuste: 1,
     *   fechacita: "2024/01/20"
     * };
     * 
     * // Cambiar sede (ajuste tipo 2)
     * const ajusteSede = {
     *   codpuntocontrol: "1",
     *   ajuste: 2,
     *   latitud: "4.7110",
     *   longitud: "-74.0721",
     *   codmunicipio: "11001001"
     * };
     * 
     * const resultado = await rndcPuntosControlRepository.actualizarAjuste("123456789", ajusteFecha);
     */
    async actualizarAjuste(manifiestoId, punto) {
        try {
            const manifiestoIdRNCD = manifiestoId;

            const manifiestoQuery = await DbConfig.executeQuery(`SELECT * FROM rndc_consultas WHERE numero_manifiesto = ?`, [manifiestoIdRNCD]);
            if (!manifiestoQuery.success || manifiestoQuery.data.length === 0) {
                return { success: false, error: 'Manifiesto no encontrado', data: [] };
            }
            const fecha_cita_str = punto.fechacita + ' ' + (punto.horacita || '00:00');
            const viaje_id = manifiestoQuery.data[0].id_viaje;
            const puntoId = Number(punto.codpuntocontrol);
            const latitud = punto.latitud;
            const longitud = punto.longitud;
            const fechaCita = moment.utc(fecha_cita_str, 'YYYY/MM/DD HH:mm').toDate();
            const estado = 0;
            const tiempopactado = punto.tiempopactado;
            const codmunicipio = punto.codmunicipio;
            const ajuste = Number(punto.ajuste);
            const tiempopactadoDB = punto.tiempopactado || "0";

            const query = {
                1: `UPDATE rndc_puntos_control SET fecha_cita = ? WHERE id_punto = ? AND id_viaje = ?`,
                2: `UPDATE rndc_puntos_control SET codmunicipio = ?, longitud = ?, latitud = ? WHERE id_punto = ? AND id_viaje = ?`,
                3: `UPDATE rndc_puntos_control SET fecha_cita = ?, codmunicipio = ?, longitud = ?, latitud = ? WHERE id_punto = ? AND id_viaje = ?`,
                4: `UPDATE rndc_consultas SET estado = 3 WHERE numero_manifiesto = ?`,
                5: `UPDATE rndc_consultas SET estado = 3 WHERE numero_manifiesto = ?`
            };

            const data = {
                1: [fechaCita, puntoId, viaje_id],
                2: [codmunicipio, longitud, latitud, puntoId, viaje_id],
                3: [fechaCita, codmunicipio, longitud, latitud, puntoId, viaje_id],
                4: [manifiestoIdRNCD],
                5: [manifiestoIdRNCD]
            };

            const actionToDB = await DbConfig.executeQuery(query[ajuste], data[ajuste]);

            if (!actionToDB.success) return { success: false, error: 'Error updating ajuste', data: [] };

            return { success: true, message: 'Ajuste updated successfully', data: actionToDB };

        } catch (error) {
            console.error('Error in actualizarAjuste repository:', error);
            return { success: false, error: 'Database error', data: [] };
        }

    },

    /**
     * Obtiene la información de un punto de control específico basado en el manifiesto y punto ID.
     * Realiza una búsqueda combinada usando el manifiesto y el identificador del punto.
     * @async
     * @function getPuntoDeControl
     * @param {string|number} numero_manifiesto - Número del manifiesto RNDC
     * @param {string|number} puntoId - ID del punto de control a buscar
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {string} [returns.message] - Mensaje descriptivo del resultado
     * @returns {Array} returns.data - Array con los datos del punto encontrado o vacío si no existe
     * @throws {Error} Error de base de datos o validación
     * @example
     * const resultado = await rndcPuntosControlRepository.getPuntoDeControl("123456789", "1");
     * 
     * if (resultado.success) {
     *   const puntoControl = resultado.data[0];
     *   console.log("Punto encontrado:", {
     *     id_punto: puntoControl.id_punto,
     *     latitud: puntoControl.latitud,
     *     longitud: puntoControl.longitud,
     *     fecha_cita: puntoControl.fecha_cita,
     *     estado: puntoControl.estado
     *   });
     * } else {
     *   console.error("Error:", resultado.error);
     * }
     */
    async getPuntoDeControl(numero_manifiesto, puntoId) {
        try {
            const manifiesto = await rndcManifiestoRepository.getManifiestoByingresoidmanifiesto(numero_manifiesto);
            if (!manifiesto.success || manifiesto.data.length === 0) return manifiesto;

            const punto = await DbConfig.executeQuery(`SELECT * FROM rndc_puntos_control WHERE id_viaje = ? AND id_punto = ?`, [manifiesto.data[0].id_viaje, puntoId]);
            if (!punto.success) return { success: false, error: 'Punto de control no encontrado', data: [] };

            return { success: true, message: 'Punto de control retrieved successfully', data: punto.data };
        } catch (error) {
            console.error('Error in getPuntoDeControl repository:', error);
            return { success: false, error: 'Database error', data: [] };
        }
    },

    async getAllNotProcessedPuntosControlByManifiesto(manifiestoId) {
        try {
            const puntos = await DbConfig.executeQuery(`SELECT * FROM rndc_puntos_control WHERE id_viaje = ? AND estado != 2`, [manifiestoId]);
            if (!puntos.success) return { success: false, error: 'No se encontraron puntos de control', data: [] };
            return { success: true, message: 'Puntos de control encontrados', data: puntos.data };
        } catch (error) {
            console.error('Error in getAllNotProcessedPuntosControlByManifiesto repository:', error);
            return { success: false, error: 'Database error', data: [] };
        }
    }
};

module.exports = rndcPuntosControlRepository;