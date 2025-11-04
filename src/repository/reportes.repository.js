const DbConfig = require('../config/db');

const reportesRepository = {
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