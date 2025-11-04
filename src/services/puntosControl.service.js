const rndcPuntosControlRepository = require("../repository/rndc_puntos_control");

const puntosControlService = {

    async getPuntoDeControl(id_viaje, puntoId) {
        try {
            const punto = await rndcPuntosControlRepository.getPuntoDeControl(id_viaje, puntoId);
            if (!punto.status) return { success: false, error: 'Error retrieving punto de control', data: [] };

            return { success: true, message: 'Punto de control retrieved successfully', data: punto.data };

        } catch (error) {
            console.error('Error in getPuntoDeControl service:', error);
            return { success: false, error: true, message: 'Internal server error', data: [] };
        }

    },
    async crearPuntosControl(id_viaje, punto) {
        try {
            const puntoExists = await this.getPuntoDeControl(id_viaje, punto.codpuntocontrol);
            if (!puntoExists.status) return puntoExists;

            if (puntoExists.data.length > 0) {
                return { success: true, message: 'Punto de control already exists', data: puntoExists.data };
            }

            const puntoControlQuery = await rndcPuntosControlRepository.createPuntosControl(id_viaje, punto);
            if (!puntoControlQuery.success) return { success: false, error: 'Error creating punto de control', data: [] };
            return { success: true, message: 'Punto de control created successfully', data: puntoControlQuery.data };

        } catch (error) {
            console.error('Error in crearPuntosControl service:', error);
            return { success: false, error: 'Internal server error', data: [] };
        }
    },
    async actualizarPuntoControl(id_viaje, punto) {
        try {
            const puntoExists = await this.getPuntoDeControl(id_viaje, punto.codpuntocontrol);
            if (!puntoExists.status) return puntoExists;

            if (puntoExists.data.length <= 0) {
                const puntoControlQuery = await this.createPuntosControl(id_viaje, punto);
                if (!puntoControlQuery.success) return puntoControlQuery;
                return { success: true, message: 'Punto de control created successfully', data: puntoControlQuery.data };
            }

            const puntoControlQuery = await rndcPuntosControlRepository.actualizarAjuste(id_viaje, punto);
            if (!puntoControlQuery.success) return { success: false, error: 'Error updating punto de control', data: [] };

            return { success: true, message: 'Punto de control updated successfully', data: puntoControlQuery.data };
        } catch (error) {
            console.error('Error in actualizarPuntoControl service:', error);
            return { success: false, error: 'Internal server error', data: [] };
        }
    },
    async procesarPuntosControl(id_viaje, puntosControl) {
        try {
            const errors = [];
            for (const punto of puntosControl) {
                if (punto.ajuste) {
                    const ajustarPunto = this.actualizarPuntoControl(id_viaje, punto);
                    if (!ajustarPunto.success) errors.push(`El ajuste de ${ajustarPunto.data.codpuntocontrol} en el manifiesto ${id_viaje} falló: ${ajustarPunto.message}`);
                } else {
                    const crearPunto = this.crearPuntosControl(id_viaje, punto);
                    if (!crearPunto.success) errors.push(`La creación de ${crearPunto.data.codpuntocontrol} en el manifiesto ${id_viaje} falló: ${crearPunto.message}`);
                }
            }

            return { success: true, message: 'Puntos de control processed successfully', data: [], errors };
        } catch (error) {
            console.error('Error in actualizarPuntosControlForManifiesto service:', error);
            return { success: false, error: 'Internal server error', data: [] };
        }
    },

    async createPuntosControlForManifiesto(id_viaje, puntosControl) {
        try {
            const errors = [];
            for (const punto of puntosControl) {
                //se crean los puntos de control asociados al manifiesto

            }

            return { success: errors.length === 0, errors };

        } catch (error) {
            console.error('Error in createPuntosControlForManifiesto service:', error);
            return { success: false, error: 'Internal server error', data: [] };
        }
    }

}

module.exports = puntosControlService;