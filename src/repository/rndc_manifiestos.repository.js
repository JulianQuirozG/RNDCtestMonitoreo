const DbConfig = require('../config/db');

const rndcManifiestoRepository = {

    async createManifiesto(data) {
        try {
            const numero_manifiesto = data.ingresoidmanifiesto;
            const fecha_registro = new Date(data.fechaexpedicionmanifiesto)
            const nit_transportadora = data.numnitempresatransporte
            const consec_manifiesto = data.nummanifiestocarga
            const placa_vehiculo = data.numplaca

            const nuevoManifiesto = await DbConfig.executeQuery(`INSERT INTO rndc_consultas 
                    (numero_manifiesto, fecha_registro, nit_transportadora, 
                    consec_manifiesto,placa_vehiculo  ) VALUES (?, ?, ?, ?, ?)`, [numero_manifiesto, fecha_registro, nit_transportadora, consec_manifiesto, placa_vehiculo]);

            if (!nuevoManifiesto.success) return { success: false, error: 'Error inserting manifiesto', data: [] };

            return { success: true, message: 'Manifiesto created successfully', data: nuevoManifiesto.data };

        } catch (error) {
            console.error('Error in createManifiesto repository:', error);
            return { success: false, error: true, message: 'Database error', data: [] };
        }
    },
    async getManifiestoByingresoidmanifiesto(ingresoidmanifiesto) {
        try {
            const manifiestoQuery = await DbConfig.executeQuery(`SELECT * FROM rndc_consultas WHERE numero_manifiesto = ?`, [ingresoidmanifiesto]);
            if (!manifiestoQuery.success || manifiestoQuery.data.length === 0) {
                return { success: false, error: 'Manifiesto no encontrado', data: [] };
            }
            return { success: true, message: 'Manifiesto encontrado', data: manifiestoQuery.data };
        } catch (error) {
            console.error('Error in getManifiestoByingresoidmanifiesto repository:', error);
            return { success: false, error: 'Database error', data: [] };
        }
    }
}

module.exports = rndcManifiestoRepository;