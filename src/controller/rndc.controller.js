const { rndcService } = require('../services/rndc.service');


const rndcController = {

    async sincronizarRegistrosRNDC(req, res) {
        try {
            const result = await rndcService.sincronizarRegistrosRNDC(req.body);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error in sincronizarRegistrosRNDC controller:', error);
            res.status(500).json({ ok: false, error: 'Internal server error' });
            return;
        }

    },

    async reportarNovedad(req, res) {
        try {
            const data = req.body;
            const tipo = data.tipo;
            const result = await rndcServiceInstance.reportarNovedadRndc({
                NUMIDGPS: data.id_gps,
                INGRESOIDMANIFIESTO: data.manifiesto,
                CODPUNTOCONTROL: data.punto_control,
                NUMPLACA: data.placa,
            }, tipo);
            res.status(result.statusCode).json(result);
        } catch (error) {
            console.error('Error in reportarNovedad controller:', error);
            res.status(500).json({ ok: false, error: 'Internal server error' });
            return;
        }
    }
};

module.exports = rndcController;