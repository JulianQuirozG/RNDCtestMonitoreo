const rndcPuntosControlRepository = require("../repository/rndc_puntos_control");

const puntosControlService = {

    /**
     * Obtiene un punto de control específico por número de manifiesto y ID del punto.
     * Realiza una búsqueda en la base de datos para recuperar la información del punto de control.
     * @async
     * @function getPuntoDeControl
     * @param {string|number} numero_manifiesto - Número único del manifiesto RNDC
     * @param {string|number} puntoId - ID del punto de control a buscar
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Array} returns.data - Array con los datos del punto encontrado o vacío si no existe
     * @throws {Error} Error del servicio o conexión a base de datos
     * @example
     * const resultado = await puntosControlService.getPuntoDeControl("123456789", "1");
     * 
     * if (resultado.success) {
     *   const punto = resultado.data[0];
     *   console.log("Punto encontrado:", {
     *     id_punto: punto.id_punto,
     *     latitud: punto.latitud,
     *     longitud: punto.longitud,
     *     fecha_cita: punto.fecha_cita
     *   });
     * } else {
     *   console.error("Error:", resultado.error);
     * }
     */
    async getPuntoDeControl(numero_manifiesto, puntoId) {
        try {
            const punto = await rndcPuntosControlRepository.getPuntoDeControl(numero_manifiesto, puntoId);
            console.log('puntoControlService - getPuntoDeControl:', punto);
            if (!punto.success) return { success: false, error: 'Error retrieving punto de control', data: [] };

            return { success: true, message: 'Punto de control retrieved successfully', data: punto.data };

        } catch (error) {
            console.error('Error in getPuntoDeControl service:', error);
            return { success: false, error: true, message: 'Internal server error', data: [] };
        }

    },

    /**
     * Crea un nuevo punto de control para un manifiesto específico.
     * Verifica primero si el punto ya existe para evitar duplicados antes de crear.
     * @async
     * @function crearPuntosControl
     * @param {string|number} numero_manifiesto - Número único del manifiesto RNDC
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
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Array|Object} returns.data - Datos del punto creado o información del punto existente
     * @throws {Error} Error del servicio o conexión a base de datos
     * @example
     * const nuevoPunto = {
     *   codpuntocontrol: "1",
     *   latitud: "4.5981",
     *   longitud: "-74.0758",
     *   fechacita: "2024/01/15",
     *   horacita: "08:30",
     *   tiempopactado: "120",
     *   codmunicipio: "11001000"
     * };
     * 
     * const resultado = await puntosControlService.crearPuntosControl("123456789", nuevoPunto);
     * 
     * if (resultado.success) {
     *   console.log("Punto creado exitosamente");
     * } else if (resultado.message === 'Punto de control already exists') {
     *   console.log("El punto ya existe en el sistema");
     * } else {
     *   console.error("Error creando punto:", resultado.error);
     * }
     */
    async crearPuntosControl(numero_manifiesto, punto) {
        try {
            const puntoExists = await this.getPuntoDeControl(numero_manifiesto, punto.codpuntocontrol);
            console.log('puntoExists', puntoExists);
            if (!puntoExists.success) return puntoExists;

            if (puntoExists.data.length > 0) {
                return { success: false, message: 'Punto de control already exists', data: puntoExists.data };
            }

            const puntoControlQuery = await rndcPuntosControlRepository.createPuntosControl(numero_manifiesto, punto);
            if (!puntoControlQuery.success) return { success: false, error: 'Error creating punto de control', data: [] };
            return { success: true, message: 'Punto de control created successfully', data: puntoControlQuery.data };

        } catch (error) {
            console.error('Error in crearPuntosControl service:', error);
            return { success: false, error: 'Internal server error', data: [] };
        }
    },

    /**
     * Actualiza un punto de control existente o lo crea si no existe.
     * Aplica ajustes a puntos de control existentes según las reglas RNDC.
     * @async
     * @function actualizarPuntoControl
     * @param {string|number} numero_manifiesto - Número único del manifiesto RNDC
     * @param {Object} punto - Datos del punto de control con información de ajuste
     * @param {string|number} punto.codpuntocontrol - Código identificador del punto de control
     * @param {number} [punto.ajuste] - Tipo de ajuste a aplicar (1-5)
     * @param {string|number} [punto.latitud] - Nueva coordenada de latitud
     * @param {string|number} [punto.longitud] - Nueva coordenada de longitud
     * @param {string} [punto.fechacita] - Nueva fecha de cita
     * @param {string} [punto.codmunicipio] - Nuevo código de municipio
     * @param {string|number} [punto.tiempopactado] - Tiempo pactado en minutos
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Array|Object} returns.data - Datos del punto actualizado o creado
     * @returns {Array<string>} [returns.errors] - Array de errores específicos si los hay
     * @throws {Error} Error del servicio o conexión a base de datos
     * @example
     * // Actualizar punto existente con ajuste
     * const puntoAjuste = {
     *   codpuntocontrol: "1",
     *   ajuste: 2,
     *   latitud: "4.7110",
     *   longitud: "-74.0721",
     *   codmunicipio: "11001001"
     * };
     * 
     * const resultado = await puntosControlService.actualizarPuntoControl("123456789", puntoAjuste);
     * 
     * if (resultado.success) {
     *   console.log("Punto actualizado:", resultado.message);
     * } else {
     *   console.error("Error:", resultado.error);
     *   if (resultado.errors) {
     *     resultado.errors.forEach(err => console.error("- ", err));
     *   }
     * }
     * 
     * // Crear punto si no existe
     * const nuevoPunto = {
     *   codpuntocontrol: "2",
     *   latitud: "4.5981",
     *   longitud: "-74.0758"
     * };
     * 
     * const resultado2 = await puntosControlService.actualizarPuntoControl("123456789", nuevoPunto);
     */
    async actualizarPuntoControl(numero_manifiesto, punto) {
        try {
            const puntoExists = await this.getPuntoDeControl(numero_manifiesto, punto.codpuntocontrol);
            if (!puntoExists.success) return { success: false, error: puntoExists.error, data: [], errors: [`Error verificando existencia de punto de control ${punto.codpuntocontrol} para manifiesto ${numero_manifiesto}`] };

            if (puntoExists.data.length <= 0) {
                const puntoControlQuery = await this.crearPuntosControl(numero_manifiesto, punto);
                if (!puntoControlQuery.success) return { success: false, error: puntoControlQuery.error, data: [], errors: [`Error creando punto de control ${punto.codpuntocontrol} para manifiesto ${numero_manifiesto}`] };
                return { success: true, message: 'Punto de control created successfully', data: puntoControlQuery.data };
            }

            const puntoControlQuery = await rndcPuntosControlRepository.actualizarAjuste(numero_manifiesto, punto);
            if (!puntoControlQuery.success) return { success: false, error: puntoControlQuery.error, data: [], errors: [`Error actualizando punto de control ${punto.codpuntocontrol} para manifiesto ${numero_manifiesto}`] };

            return { success: true, message: 'Punto de control updated successfully', data: puntoControlQuery.data };
        } catch (error) {
            console.error('Error in actualizarPuntoControl service:', error);
            return { success: false, error: 'Internal server error', data: [] };
        }
    },

    /**
     * Procesa múltiples puntos de control para un manifiesto específico.
     * Itera sobre un array de puntos y determina si crear nuevos puntos o aplicar ajustes.
     * @async
     * @function procesarPuntosControl
     * @param {string|number} numero_manifiesto - Número único del manifiesto RNDC
     * @param {Array<Object>} puntosControl - Array de puntos de control a procesar
     * @param {string|number} puntosControl[].codpuntocontrol - Código identificador del punto
     * @param {number} [puntosControl[].ajuste] - Tipo de ajuste si aplica (1-5)
     * @param {string|number} [puntosControl[].latitud] - Coordenada de latitud
     * @param {string|number} [puntosControl[].longitud] - Coordenada de longitud
     * @param {string} [puntosControl[].fechacita] - Fecha de la cita
     * @param {string} [puntosControl[].horacita] - Hora de la cita
     * @param {string|number} [puntosControl[].tiempopactado] - Tiempo pactado en minutos
     * @param {string} [puntosControl[].codmunicipio] - Código del municipio
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} returns.success - Indica si la operación general fue exitosa
     * @returns {string} [returns.error] - Mensaje de error si la operación falló completamente
     * @returns {string} returns.message - Mensaje descriptivo del resultado
     * @returns {Array} returns.data - Array vacío (los datos están en operaciones individuales)
     * @returns {Array<string>} returns.errors - Array de errores específicos por cada punto procesado
     * @throws {Error} Error del servicio o conexión a base de datos
     * @example
     * const puntosDeControl = [
     *   {
     *     codpuntocontrol: "1",
     *     latitud: "4.5981",
     *     longitud: "-74.0758",
     *     fechacita: "2024/01/15",
     *     horacita: "08:30"
     *   },
     *   {
     *     codpuntocontrol: "2",
     *     ajuste: 2,
     *     latitud: "4.7110",
     *     longitud: "-74.0721",
     *     codmunicipio: "11001001"
     *   }
     * ];
     * 
     * const resultado = await puntosControlService.procesarPuntosControl("123456789", puntosDeControl);
     * 
     * if (resultado.success) {
     *   console.log("Procesamiento completado:", resultado.message);
     *   
     *   if (resultado.errors.length > 0) {
     *     console.log("Errores encontrados:");
     *     resultado.errors.forEach(error => console.log("- ", error));
     *   } else {
     *     console.log("Todos los puntos se procesaron correctamente");
     *   }
     * } else {
     *   console.error("Error en procesamiento:", resultado.error);
     * }
     * 
     * // Procesar con validación de errores
     * const procesarConValidacion = async (manifiesto, puntos) => {
     *   const resultado = await puntosControlService.procesarPuntosControl(manifiesto, puntos);
     *   
     *   const exitosos = puntos.length - resultado.errors.length;
     *   console.log(`Procesados: ${exitosos}/${puntos.length} puntos`);
     *   
     *   return resultado.errors.length === 0;
     * };
     */
    async procesarPuntosControl(numero_manifiesto, puntosControl) {
        try {
            const errors = [];

            for (const punto of puntosControl) {
                if (punto.ajuste) {
                    const ajustarPunto = await this.actualizarPuntoControl(numero_manifiesto, punto);
                    if (!ajustarPunto.success) errors.push(`El ajuste del punto de control ${punto.codpuntocontrol} en el manifiesto ${numero_manifiesto} falló: ${ajustarPunto.message}`);
                } else {
                    const crearPunto = await this.crearPuntosControl(numero_manifiesto, punto);
                    if (!crearPunto.success) errors.push(`La creación del punto de control ${punto.codpuntocontrol} en el manifiesto ${numero_manifiesto} falló: ${crearPunto.message}`);
                }
            }

            return { success: true, message: 'Puntos de control processed successfully', data: [], errors };
        } catch (error) {
            console.error('Error in actualizarPuntosControlForManifiesto service:', error);
            return { success: false, error: 'Internal server error', data: [] };
        }
    },

    async getAllNotProcessedPuntosControlByManifiesto(manifiestoId){
        try {
            const puntos = await rndcPuntosControlRepository.getAllNotProcessedPuntosControlByManifiesto(manifiestoId);
            if (!puntos.success) return { error: false, success: false, message: 'Error retrieving puntos de control', data: puntos.data };
            return { success: true, data: puntos.data };
        } catch (error) {
            console.error('Error in getAllNotProcessedPuntosControlByManifiesto service:', error);
            return { error: true, success: false, message: 'Internal server error', data: error };
        }
    }


}

module.exports = puntosControlService;