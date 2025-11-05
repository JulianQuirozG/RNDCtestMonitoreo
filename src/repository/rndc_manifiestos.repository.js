const DbConfig = require('../config/db');

const rndcManifiestoRepository = {
    /**
     * Crea un nuevo manifiesto RNDC en la base de datos.
     * Extrae y transforma los datos del formato RNDC a la estructura de base de datos.
     * @async
     * @function createManifiesto
     * @param {Object} data - Datos del manifiesto en formato RNDC
     * @param {string|number} data.ingresoidmanifiesto - ID único del manifiesto RNDC
     * @param {string} data.fechaexpedicionmanifiesto - Fecha de expedición del manifiesto en formato string
     * @param {string|number} data.numnitempresatransporte - NIT de la empresa transportadora
     * @param {string|number} data.nummanifiestocarga - Número consecutivo del manifiesto de carga
     * @param {string} data.numplaca - Placa del vehículo transportador
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {string} [returns.message] - Mensaje descriptivo del resultado
     * @returns {Object|Array} returns.data - Datos del manifiesto creado (incluye insertId) o array vacío en caso de error
     * @throws {Error} Error de base de datos o conversión de datos
     * @example
     * const manifestoData = {
     *   ingresoidmanifiesto: "123456789",
     *   fechaexpedicionmanifiesto: "2024-01-15",
     *   numnitempresatransporte: "900123456",
     *   nummanifiestocarga: "001",
     *   numplaca: "ABC123"
     * };
     * 
     * const resultado = await rndcManifiestoRepository.createManifiesto(manifestoData);
     * 
     * if (resultado.success) {
     *   console.log("Manifiesto creado con ID:", resultado.data.insertId);
     * } else {
     *   console.error("Error creando manifiesto:", resultado.error);
     * }
     */
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

    /**
     * Busca y obtiene un manifiesto específico por su ID de ingreso RNDC.
     * Realiza una consulta en la tabla rndc_consultas usando el número de manifiesto como clave.
     * @async
     * @function getManifiestoByingresoidmanifiesto
     * @param {string|number} ingresoidmanifiesto - ID único del manifiesto a buscar
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {string} [returns.message] - Mensaje descriptivo del resultado
     * @returns {Array} returns.data - Array con los datos del manifiesto encontrado o array vacío si no existe
     * @throws {Error} Error de base de datos
     * @example
     * const resultado = await rndcManifiestoRepository.getManifiestoByingresoidmanifiesto("123456789");
     * 
     * if (resultado.success && resultado.data.length > 0) {
     *   const manifiesto = resultado.data[0];
     *   console.log("Manifiesto encontrado:", {
     *     id_viaje: manifiesto.id_viaje,
     *     numero_manifiesto: manifiesto.numero_manifiesto,
     *     fecha_registro: manifiesto.fecha_registro,
     *     nit_transportadora: manifiesto.nit_transportadora,
     *     placa_vehiculo: manifiesto.placa_vehiculo
     *   });
     * } else {
     *   console.log("Manifiesto no encontrado");
     * }
     * 
     * // Verificar existencia
     * const existe = resultado.success && resultado.data.length > 0;
     * if (!existe) {
     *   console.log("El manifiesto no existe en la base de datos");
     * }
     */
    async getManifiestoByingresoidmanifiesto(ingresoidmanifiesto) {
        try {
            const manifiestoQuery = await DbConfig.executeQuery(`SELECT * FROM rndc_consultas WHERE numero_manifiesto = ?`, [ingresoidmanifiesto]);
            if (!manifiestoQuery.success) {
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