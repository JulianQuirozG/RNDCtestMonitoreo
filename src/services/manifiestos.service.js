const rndcManifiestoRepository = require("../repository/rndc_manifiestos.repository");
const rndcPuntosControlRepository = require("../repository/rndc_puntos_control");

const manifiestosService = {

    async getManifiestoByingresoidmanifiesto(ingresoidmanifiesto) {
        try {
            const manifiesto = await rndcManifiestoRepository.getManifiestoByingresoidmanifiesto(ingresoidmanifiesto);
            return manifiesto;
        }
        catch (error) {
            console.error('Error in getManifiestoByingresoidmanifiesto service:', error);
            return { success: false, error: 'Service error', data: [] };
        }
    },
    async createmanifiesto(data) {
        try {
            const manifiestoExists = await this.getManifiestoByingresoidmanifiesto(data.ingresoidmanifiesto);
            if (!manifiestoExists.success) return manifiestoExists;

            if (manifiestoExists.data.length > 0) {
                return { success: false, message: `Manifiesto ${data.ingresoidmanifiesto} ya existe`, data: manifiestoExists.data, errors:[`Manifiesto ${data.ingresoidmanifiesto} ya existe`] };
            }

            const create = await rndcManifiestoRepository.createManifiesto(data);
            if (!create.success) return { success: false, error: create.error, data: [], errors: [`Manifiesto ${data.ingresoidmanifiesto} No se pudo crear`] };

            return { success: true, message: 'Manifiesto created successfully', data: create.data };

        } catch (error) {
            console.error('Error in createmanifiesto service:', error);
            return { success: false, error: 'Service error', data: [] };
        }
    },
    async actualizarManifiesto(data) {
        try {
            const ajustarManifiesto = await rndcPuntosControlRepository.actualizarAjuste(data);
            if (!ajustarManifiesto.success) return ajustarManifiesto;

            return { success: true, message: 'Manifiesto updated successfully', data: ajustarManifiesto.data };
        }
        catch (error) {
            console.error('Error in actualizarManifiesto service:', error);
            return { success: false, error: 'Service error', data: [] };
        }

    },
    async procesarManifiesto(data) {
        try {
            // Lógica para procesar el manifiesto
            const errors = [];

            if (data.ajuste) {
                const puntoControlAjuste = await this.actualizarManifiesto(data);
                if (!puntoControlAjuste.success) errors.push(`Error actualizando punto de control EMF ${data.ajuste.id_punto} para manifiesto ${data.ingresoidmanifiesto}: ${puntoControlAjuste.error}`);
                return { success: puntoControlAjuste.success, ajuste: true, message: 'Ajuste processed successfully', data: puntoControlAjuste.data, errors };
            }

            const nuevoManifiesto = await this.createmanifiesto(data);

            if (!nuevoManifiesto.success) errors.push(...nuevoManifiesto?.errors);

            return { success: true, ajuste: true, message: 'Manifiesto processed successfully', data: nuevoManifiesto.data, errors };

        } catch (error) {
            console.error('Error in procesarManifiesto service:', error);
            return { success: false, error: 'Service error', data: [], errors:[] };
        }
    }


};

module.exports = manifiestosService;