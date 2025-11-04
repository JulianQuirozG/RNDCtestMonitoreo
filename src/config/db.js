const mysql = require('mysql2/promise');

let pool = null;
/**
 * @module DbConfig
 * @description Utilidades para la conexión a MySQL usando mysql2/promise.
 *
 * @example
 * const DbConfig = require('./config/db.js');
 * await DbConfig.init({ host, user, password, database, port });
 * const rows = await DbConfig.executeQuery('SELECT * FROM tabla WHERE id = ?', [id]);
 */
const DbConfig = {
    /**
     * Inicializa el pool de conexiones con la configuración dada.
     * @function
     * @name init
     * @memberof module:DbConfig
     * @param {Object} config - Configuración de la base de datos.
     * @param {string} config.host - Host de la base de datos.
     * @param {string} config.user - Usuario.
     * @param {string} config.password - Contraseña.
     * @param {string} config.database - Nombre de la base de datos.
     * @param {number} config.port - Puerto.
     * @returns {Promise<{status: boolean, message: string}>} Resultado de la inicialización.
     */
    async init(config) {
        try {

            pool = mysql.createPool(config);
            const connection = await pool.getConnection();
            await connection.ping(); // Verifica que haya respuesta
            connection.release();

            console.info("✅ Conexión a la base de datos verificada exitosamente.");
            return {
                status: true,
                message: "Conexión a la base de datos inicializada correctamente.",
            }
        } catch (error) {
            console.error("Error al inicializar la conexión a la base de datos:1 ", error);
            return {
                status: false,
                message: "Error al inicializar la conexión a la base de datos.",
            };
        }
    },

    /**
     * Ejecuta una consulta SQL usando el pool.
     * @function
     * @name executeQuery
     * @memberof module:DbConfig
     * @param {string} query - Consulta SQL parametrizada.
     * @param {Array} [params=[]] - Parámetros para la consulta.
     * @returns {Promise<Array>} Filas resultantes.
     */
    async executeQuery(query, params = []) {
        try {
            const [rows] = await pool.execute(query, params);
            return { success: true, message: 'Query executed successfully', data: rows };
        } catch (error) {
            console.error("Error executing query: ", error);
            return { statusCode: 500, success: false, error: true, message: 'Error executing query', data: [] };
        }
    },

    async getConnection() {
        try {
            const connection = await pool.getConnection();
            return { success: true, message: 'Connection acquired', data: connection };
        } catch (error) {
            console.error("Error getting connection: ", error);
            return { success: false, error: true, message: 'Error getting connection', data: null };
        }
    }

};

module.exports = DbConfig;