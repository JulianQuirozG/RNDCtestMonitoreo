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

    }
};

module.exports = rndcController;