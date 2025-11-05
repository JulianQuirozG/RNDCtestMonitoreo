const rndcManifiestoRepository = require("../repository/rndc_manifiestos.repository");
const rndcPuntosControlRepository = require("../repository/rndc_puntos_control");

const manifiestosService = {
    /**
     * Obtiene un manifiesto por su ID de ingreso.
     * @async
     * @function getManifiestoByingresoidmanifiesto
     * @param {string|number} ingresoidmanifiesto - ID único del manifiesto a buscar
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {Array} returns.data - Array con los datos del manifiesto encontrado
     * @example
     * const resultado = await manifiestosService.getManifiestoByingresoidmanifiesto("123456789");
     * if (resultado.success) {
     *   console.log("Manifiesto encontrado:", resultado.data);
     * }
     */
    async getManifiestoByingresoidmanifiesto(ingresoidmanifiesto) {
        try {
            const manifiesto = await rndcManifiestoRepository.getManifiestoByingresoidmanifiesto(ingresoidmanifiesto);
            return manifiesto;
        } catch (error) {
            console.error('Error in getManifiestoByingresoidmanifiesto service:', error);
            return { success: false, error: 'Service error', data: [] };
        }
    },

    /**
     * Crea un nuevo manifiesto en la base de datos.
     * Verifica primero si el manifiesto ya existe para evitar duplicados.
     * @async
     * @function createmanifiesto
     * @param {Object} data - Datos del manifiesto a crear
     * @param {string} data.ingresoidmanifiesto - ID único del manifiesto
     * @param {string} data.fechaexpedicionmanifiesto - Fecha de expedición del manifiesto
     * @param {string} data.numnitempresatransporte - NIT de la empresa transportadora
     * @param {string} data.nummanifiestocarga - Número consecutivo del manifiesto
     * @param {string} data.numplaca - Placa del vehículo
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Object|Array} returns.data - Datos del manifiesto creado o existente
     * @returns {Array<string>} [returns.errors] - Array de errores si los hay
     * @example
     * const nuevoManifiesto = {
     *   ingresoidmanifiesto: "123456789",
     *   fechaexpedicionmanifiesto: "2024-01-15",
     *   numnitempresatransporte: "900123456",
     *   nummanifiestocarga: "001",
     *   numplaca: "ABC123"
     * };
     * const resultado = await manifiestosService.createmanifiesto(nuevoManifiesto);
     */
    async createmanifiesto(data) {
        try {
            const manifiestoExists = await this.getManifiestoByingresoidmanifiesto(data.ingresoidmanifiesto);
            if (!manifiestoExists.success) return manifiestoExists;

            if (manifiestoExists.data.length > 0) {
                return { success: false, message: `Manifiesto ${data.ingresoidmanifiesto} ya existe`, data: manifiestoExists.data, errors: [`Manifiesto ${data.ingresoidmanifiesto} ya existe`] };
            }

            const create = await rndcManifiestoRepository.createManifiesto(data);
            if (!create.success) return { success: false, error: create.error, data: [], errors: [`Manifiesto ${data.ingresoidmanifiesto} No se pudo crear`] };

            return { success: true, message: 'Manifiesto created successfully', data: create.data };

        } catch (error) {
            console.error('Error in createmanifiesto service:', error);
            return { success: false, error: 'Service error', data: [] };
        }
    },

    /**
     * Actualiza un manifiesto existente o lo crea si no existe.
     * Si el manifiesto existe, aplica los ajustes correspondientes.
     * @async
     * @function actualizarManifiesto
     * @param {Object} data - Datos del manifiesto a actualizar
     * @param {string} data.ingresoidmanifiesto - ID único del manifiesto
     * @param {number} [data.ajuste] - Tipo de ajuste a aplicar (1-5)
     * @param {Object} [data.puntoscontrol] - Puntos de control del manifiesto
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Object} returns.data - Datos del manifiesto actualizado o creado
     * @returns {Array<string>} [returns.errors] - Array de errores si los hay
     * @example
     * const datosActualizacion = {
     *   ingresoidmanifiesto: "123456789",
     *   ajuste: 2,
     *   puntoscontrol: { puntocontrol: [...] }
     * };
     * const resultado = await manifiestosService.actualizarManifiesto(datosActualizacion);
     */
    async actualizarManifiesto(data) {
        try {
            const manifiestoExists = await this.getManifiestoByingresoidmanifiesto(data.ingresoidmanifiesto);
            if (!manifiestoExists.success) return { success: false, error: manifiestoExists.error, data: [], errors: [`Error verificando existencia de manifiesto ${data.ingresoidmanifiesto}`] };

            if (manifiestoExists.data.length === 0) {
                const createManifiesto = await this.createmanifiesto(data);
                if (!createManifiesto.success) return { success: false, error: createManifiesto.error, data: [], errors: [`Manifiesto ${data.ingresoidmanifiesto} No existe en la base de datos y se genero un error al intentar crearlo`] };
                return { success: true, message: `Manifiesto ${data.ingresoidmanifiesto} creado porque no existía`, data: createManifiesto.data };
            }

            const ajustarManifiesto = await rndcPuntosControlRepository.actualizarAjuste(data.ingresoidmanifiesto, data);
            if (!ajustarManifiesto.success) return { success: false, error: ajustarManifiesto.error, data: [], errors: [`Error actualizando manifiesto ${data.ingresoidmanifiesto}`] };
            return { success: true, message: 'Manifiesto updated successfully', data: ajustarManifiesto.data };

        }
        catch (error) {
            console.error('Error in actualizarManifiesto service:', error);
            return { success: false, error: 'Service error', data: [] };
        }

    },

    /**
     * Procesa un manifiesto completo, incluyendo validaciones de ajustes y creación/actualización.
     * Determina si se requiere un ajuste basándose en los puntos de control y el estado actual.
     * @async
     * @function procesarManifiesto
     * @param {Object} data - Datos completos del manifiesto RNDC
     * @param {string} data.ingresoidmanifiesto - ID único del manifiesto
     * @param {string} data.fechaexpedicionmanifiesto - Fecha de expedición
     * @param {string} data.numnitempresatransporte - NIT empresa transportadora
     * @param {string} data.nummanifiestocarga - Número consecutivo
     * @param {string} data.numplaca - Placa del vehículo
     * @param {number} [data.ajuste] - Tipo de ajuste si aplica
     * @param {Object} [data.puntoscontrol] - Estructura con puntos de control
     * @param {Array} [data.puntoscontrol.puntocontrol] - Array de puntos de control
     * @returns {Promise<Object>} Resultado del procesamiento
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {boolean} returns.ajuste - Indica si se procesó como ajuste
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Object} returns.data - Datos del manifiesto procesado
     * @returns {Array<string>} returns.errors - Array de errores encontrados durante el procesamiento
     * @example
     * const manifestoCompleto = {
     *   ingresoidmanifiesto: "123456789",
     *   fechaexpedicionmanifiesto: "2024-01-15",
     *   puntoscontrol: {
     *     puntocontrol: [
     *       { codpuntocontrol: "1", ajuste: 2 },
     *       { codpuntocontrol: "2" }
     *     ]
     *   }
     * };
     * const resultado = await manifiestosService.procesarManifiesto(manifestoCompleto);
     */
    async procesarManifiesto(data) {
        try {
            // Lógica para procesar el manifiesto
            const errors = [];

            if (data.ajuste) {
                const puntoControlAjuste = await this.actualizarManifiesto(data);
                if (!puntoControlAjuste.success) errors.push(`Error actualizando punto de control EMF ${data.ajuste} para manifiesto ${data.ingresoidmanifiesto}: ${puntoControlAjuste.error}`);
                return { success: puntoControlAjuste.success, ajuste: true, message: 'Ajuste processed successfully', data: puntoControlAjuste.data, errors };
            }
            
            const manifiestoExists = await this.getManifiestoByingresoidmanifiesto(data.ingresoidmanifiesto);
            if (!manifiestoExists.success) return { success: false, error: manifiestoExists.error, data: [], errors: [`Error verificando existencia de manifiesto ${data.ingresoidmanifiesto}`] };
            const ajusteValidation = this.validarAjustePuntosControl(data);
            if (ajusteValidation?.ajuste && manifiestoExists?.data.length > 0) return { success: true, ajuste: true, message: 'Ajuste requerido en puntos de control, pero no se indicó ajuste', data: [] };

            const nuevoManifiesto = await this.createmanifiesto(data);
            if (!nuevoManifiesto.success) errors.push(...nuevoManifiesto?.errors);

            return { success: true, ajuste: true, message: 'Manifiesto processed successfully', data: nuevoManifiesto.data, errors };

        } catch (error) {
            console.error('Error in procesarManifiesto service:', error);
            return { success: false, error: 'Service error', data: [], errors: [] };
        }
    },

    /**
     * Valida si algún punto de control requiere ajuste basándose en los códigos de ajuste válidos.
     * @function validarAjustePuntosControl
     * @param {Object} data - Datos del manifiesto con puntos de control
     * @param {Object} data.puntoscontrol - Estructura de puntos de control
     * @param {Array} data.puntoscontrol.puntocontrol - Array de puntos de control
     * @param {number} [data.puntoscontrol.puntocontrol[].ajuste] - Código de ajuste del punto (1-5)
     * @returns {Object} Resultado de la validación
     * @returns {boolean} returns.success - Indica si la validación fue exitosa
     * @returns {boolean} returns.ajuste - Indica si se encontró al menos un ajuste válido
     * @returns {string} [returns.error] - Mensaje de error si la validación falló
     * @returns {Array} [returns.data] - Array vacío en caso de error
     * @returns {Array} [returns.errors] - Array de errores en caso de error
     * @description Los códigos de ajuste válidos son:
     * - 1: Cambio en la Fecha y Hora del Punto de Control
     * - 2: Cambio en la Sede del Punto de Control  
     * - 3: Cambio en la Sede y fecha del punto de control
     * - 4: Anulación del Manifiesto de Carga
     * - 5: Transbordo NO Planeado
     * @example
     * const datosManifiesto = {
     *   puntoscontrol: {
     *     puntocontrol: [
     *       { codpuntocontrol: "1", ajuste: 2 },
     *       { codpuntocontrol: "2" }
     *     ]
     *   }
     * };
     * const validacion = manifiestosService.validarAjustePuntosControl(datosManifiesto);
     * // Resultado: { success: true, ajuste: true }
     */
    validarAjustePuntosControl(data) {
        try {
            const validAjustes = [1, 2, 3, 4, 5];
            let ajuste = false;

            for (const punto of data.puntoscontrol.puntocontrol) {
                if (validAjustes.includes(Number(punto.ajuste))) {
                    ajuste = true;
                    break;
                }
            }
            return { success: true, ajuste: ajuste }
        } catch (error) {
            console.error('Error in validarAjustePuntosControl service:', error);
            return { success: false, error: 'Service error', data: [], errors: [] };
        }
    }

};

module.exports = manifiestosService;