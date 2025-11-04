const DbConfig = require('../config/db');

/**
 * Repositorio para la gestión de reportes en la base de datos.
 */
const reportesRepository = {
    /**
     * Obtiene todos los reportes con estado 0 (faltantes de envío) desde la base de datos.
     *
     * @returns {Promise<{success: boolean, error: boolean, message: string, data: Array}>}
     *          Objeto con el resultado de la consulta. En caso de éxito, `data` contiene los reportes faltantes.
     *          En caso de error, `data` contiene un array vacío o el error devuelto por la base de datos.
     */
    async obtenerReportesFaltantesPorEnvio() {
        try {
            const reportesFaltantes = await DbConfig.executeQuery(`SELECT * FROM reportes WHERE estado = 0`);
            if (!reportesFaltantes.success) {
                return { success: false, error: false, message: 'Error fetching missing reports', data: [reportesFaltantes.data] };
            }
            return { success: true, error: false, message: 'Missing reports fetched successfully', data: reportesFaltantes.data };
        } catch (error) {
            console.error('Error obtaining missing reports for sending:', error);
            return { success: false, error: true, message: 'Internal server error', data: [] };
        }
    },
    /**
     * Inserta un nuevo reporte en la base de datos.
     *
     * @param {Object} reporteData - Datos del reporte a insertar (estructura depende de la tabla `reportes`).
     * @returns {Promise<{success: boolean, error?: boolean, message: string, data: Object|Array}>}
     *          Objeto con el resultado de la operación. En caso de éxito, `data` contiene el reporte creado.
     *          En caso de error, `data` contiene un array vacío o el error devuelto por la base de datos.
     */
    async crearReporte(reporteData) {

        try {
            const reporte = await DbConfig.executeQuery(`INSERT INTO reportes (body) VALUES (?)`, [reporteData]);
            if (!reporte.success) {
                return { success: false, error: false, message: 'Error creating report', data: [reporte.data] };
            }
            return { success: true, message: 'Report created successfully', data: reporte };
        } catch (error) {
            console.error('Error creating report:', error);
            return { success: false, error: true, message: 'Internal server error', data: [] };
        }
    },

    /**
     * Actualiza los campos de un reporte existente según el id y los datos proporcionados.
     *
     * @param {number} reporteId - ID del reporte a actualizar.
     * @param {Object} data - Objeto con los campos y valores a actualizar.
     * @returns {Promise<{success: boolean, error?: boolean, message: string, data: Object|Array}>}
     *          Objeto con el resultado de la operación. En caso de éxito, `data` contiene el resultado de la actualización.
     *          En caso de error, `data` contiene un array vacío o el error devuelto por la base de datos.
     */
    async actualizarReporte(reporteId, data) {
        try {
            if (!data) return { success: false, error: false, message: 'No data provided for update', data: [] };

            // Construir los campos dinámicamente
            const campos = [];
            const valores = [];

            // Recorrer las claves del objeto data
            for (const [clave, valor] of Object.entries(data)) {
                campos.push(`${clave} = ?`);
                valores.push(valor);
            }

            // Agregar el id al final para el WHERE
            valores.push(reporteId);

            // Ejecutar la consulta de actualización
            const updateResult = await DbConfig.executeQuery(`UPDATE reportes SET ${campos.join(', ')} WHERE id = ?`, valores);
            if (!updateResult.success) {
                return { success: false, error: false, message: 'Error updating report status', data: [updateResult.data] };
            }

            return { success: true, message: 'Report status updated successfully', data: updateResult };
        } catch (error) {
            console.error('Error updating report status:', error);
            return { success: false, error: true, message: 'Internal server error', data: [] };
        }
    },
}

module.exports = reportesRepository;