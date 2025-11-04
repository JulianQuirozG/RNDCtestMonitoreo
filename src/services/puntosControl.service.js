const rndcPuntosControlRepository = require("../repository/rndc_puntos_control");

const puntosControlService = {

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

    async actualizarPuntoControl(numero_manifiesto, punto) {
        try {
            const puntoExists = await this.getPuntoDeControl(numero_manifiesto, punto.codpuntocontrol);
            if (!puntoExists.success) return puntoExists;

            if (puntoExists.data.length <= 0) {
                const puntoControlQuery = await this.crearPuntosControl(numero_manifiesto, punto);
                if (!puntoControlQuery.success) return puntoControlQuery;
                return { success: true, message: 'Punto de control created successfully', data: puntoControlQuery.data };
            }

            const puntoControlQuery = await rndcPuntosControlRepository.actualizarAjuste(numero_manifiesto, punto);
            if (!puntoControlQuery.success) return { success: false, error: 'Error updating punto de control', data: [] };

            return { success: true, message: 'Punto de control updated successfully', data: puntoControlQuery.data };
        } catch (error) {
            console.error('Error in actualizarPuntoControl service:', error);
            return { success: false, error: 'Internal server error', data: [] };
        }
    },

    async procesarPuntosControl(numero_manifiesto, puntosControl) {
        try {
            const errors = [];

            for (const punto of puntosControl) {
                if (punto.ajuste) {
                    const ajustarPunto = await this.actualizarPuntoControl(numero_manifiesto, punto);
                    if (!ajustarPunto.success) errors.push(`El ajuste de ${punto.codpuntocontrol} en el manifiesto ${numero_manifiesto} falló: ${ajustarPunto.message}`);
                } else {
                    const crearPunto = await this.crearPuntosControl(numero_manifiesto, punto);
                    if (!crearPunto.success) errors.push(`La creación de ${punto.codpuntocontrol} en el manifiesto ${numero_manifiesto} falló: ${crearPunto.message}`);
                }
            }

            return { success: true, message: 'Puntos de control processed successfully', data: [], errors };
        } catch (error) {
            console.error('Error in actualizarPuntosControlForManifiesto service:', error);
            return { success: false, error: 'Internal server error', data: [] };
        }
    },


}

module.exports = puntosControlService;