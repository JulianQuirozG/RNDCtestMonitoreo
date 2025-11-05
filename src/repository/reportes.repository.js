const DbConfig = require('../config/db');

const reportesRepository = {
    /**
     * Obtiene todos los reportes que faltan por enviar (estado = 0).
     * Consulta la tabla de reportes filtrando por estado pendiente para identificar 
     * los reportes que aún no han sido procesados o enviados.
     * @async
     * @function obtenerReportesFaltantesPorEnvio
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {boolean} returns.error - Indica si hubo error interno del servidor
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Array} returns.data - Array con los reportes pendientes o array vacío si no hay reportes
     * @throws {Error} Error de base de datos o conexión
     * @example
     * const resultado = await reportesRepository.obtenerReportesFaltantesPorEnvio();
     * 
     * if (resultado.success) {
     *   console.log(`Reportes pendientes: ${resultado.data.length}`);
     *   resultado.data.forEach(reporte => {
     *     console.log(`Reporte ID: ${reporte.id}, Creado: ${reporte.fecha_creacion}`);
     *   });
     * } else {
     *   console.error("Error obteniendo reportes:", resultado.message);
     * }
     * 
     * // Verificar si hay reportes pendientes
     * const hayReportesPendientes = resultado.success && resultado.data.length > 0;
     */
    async obtenerReportesFaltantesPorEnvio() {
        try {
            const reportesFaltantes = await DbConfig.executeQuery(`SELECT * FROM reportes WHERE estado = 0`);
            if (!reportesFaltantes.success) {
                return { success: false, error: false, message: 'Error fetching missing reports', data: [reportesFaltantes.data] };
            }
            return { success: true, error: false,  message: 'Missing reports fetched successfully', data: reportesFaltantes.data };
        } catch (error) {
            console.error('Error obtaining missing reports for sending:', error);
            return { success: false, error: true, message: 'Internal server error', data: [] };
        }
    },

    /**
     * Crea un nuevo reporte en la base de datos con estado inicial pendiente.
     * Inserta los datos del reporte y opcionalmente obtiene la lista actualizada de reportes pendientes.
     * @async
     * @function crearReporte
     * @param {string|Object} reporteData - Datos del reporte a crear (JSON string o objeto)
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {boolean} returns.error - Indica si hubo error interno del servidor
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Array|Object} returns.data - Datos del reporte creado o información del error
     * @throws {Error} Error de base de datos, JSON inválido o conexión
     * @example
     * // Crear reporte con objeto
     * const reporteData = {
     *   tipo: "RNDC_ENTRADA",
     *   manifiesto: "123456789",
     *   coordenadas: { lat: 4.5981, lng: -74.0758 },
     *   timestamp: new Date()
     * };
     * 
     * const resultado = await reportesRepository.crearReporte(JSON.stringify(reporteData));
     * 
     * if (resultado.success) {
     *   console.log("Reporte creado exitosamente");
     * } else {
     *   console.error("Error creando reporte:", resultado.message);
     * }
     * 
     * // Crear reporte con string JSON directo
     * const reporteJSON = '{"evento":"entrada","punto":"001","hora":"2024-01-15T10:30:00Z"}';
     * const resultado2 = await reportesRepository.crearReporte(reporteJSON);
     */
    async crearReporte(reporteData) {
        try {
            const reporte = await DbConfig.executeQuery(`INSERT INTO reportes (body) VALUES (?)`, [reporteData]);
           const response = await this.obtenerReportesFaltantesPorEnvio();
           console.log('response', response);
            if (!reporte.success) {
                return { success: false, error: false, message: 'Error creating report', data: [reporte.data] };
            }
        } catch (error) {
            console.error('Error creating report:', error);
            return { success: false, error: true, message: 'Internal server error', data: [] };
        }
    },

    /**
     * Actualiza el estado de un reporte específico en la base de datos.
     * Permite cambiar el estado del reporte para marcar su progreso o finalización.
     * @async
     * @function actualizarEstadoReporte
     * @param {string|number} reporteId - ID único del reporte a actualizar
     * @param {number} nuevoEstado - Nuevo estado del reporte
     * @param {number} nuevoEstado.0 - Pendiente/No enviado
     * @param {number} nuevoEstado.1 - Enviado exitosamente
     * @param {number} nuevoEstado.2 - Error en envío
     * @param {number} nuevoEstado.3 - Procesado/Completado
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {boolean} returns.error - Indica si hubo error interno del servidor
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Array|Object} returns.data - Información de la actualización o datos del error
     * @throws {Error} Error de base de datos, ID inválido o conexión
     * @example
     * // Marcar reporte como enviado exitosamente
     * const resultado = await reportesRepository.actualizarEstadoReporte(123, 1);
     * 
     * if (resultado.success) {
     *   console.log("Estado del reporte actualizado correctamente");
     * } else {
     *   console.error("Error actualizando estado:", resultado.message);
     * }
     * 
     * // Marcar reporte como con error
     * const resultadoError = await reportesRepository.actualizarEstadoReporte(456, 2);
     * 
     * // Actualizar múltiples reportes en lote
     * const reporteIds = [123, 456, 789];
     * for (const id of reporteIds) {
     *   await reportesRepository.actualizarEstadoReporte(id, 1);
     * }
     */
    async actualizarEstadoReporte(reporteId, nuevoEstado) {
        try {
            const updateResult = await DbConfig.executeQuery(`UPDATE reportes SET estado = ? WHERE id = ?`, [nuevoEstado, reporteId]);
            if (!updateResult.success) {
                return { success: false, error: false, message: 'Error updating report status', data: [updateResult.data] };
            }
        } catch (error) {
            console.error('Error updating report status:', error);
            return { success: false, error: true, message: 'Internal server error', data: [] };
        }
    }
}

module.exports = reportesRepository ;