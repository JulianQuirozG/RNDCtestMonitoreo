const rndcService = require('../util/RNDC.service');
const rndcServiceInstance = new rndcService();

const rndcController = {

    async consultarManifiesto(req, res) {
        try {
            const result = await rndcServiceInstance.consultarManifiesto();
            res.status(200).json(result);
        } catch (error) {
            console.error('Error in consultarManifiesto controller:', error);
            res.status(500).json({ ok: false, error: 'Internal server error' });
            return;
        }

    },
    async consultarManifiestoEMF(req, res) {
        try {
            const result = await rndcServiceInstance.consultarManifiestoEMF();
            res.status(200).json(result);
        } catch (error) {
            console.error('Error in consultarManifiestoEMF controller:', error);
            res.status(500).json({ ok: false, error: 'Internal server error' });
            return;
        }
    },
    async consultarManifiestosPrueba(req, res) {
        try {
            
            const data = req.body;

            const result = await rndcServiceInstance.consultarManifiestosPrueba(data);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error in consultarManifiestosPrueba controller:', error);
            res.status(500).json({ ok: false, error: 'Internal server error' });
            return;
        }
    }
};

module.exports = rndcController;