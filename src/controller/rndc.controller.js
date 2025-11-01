const rndcService = require('../util/RNDC.service');
const rndcServiceInstance = new rndcService();

const rndcController = {
    // async createManifiesto(req, res) {
    //     const { data, user } = req.body;
    //     const result = await rndcServiceInstance.createManifiesto(data, user);
    //     res.status(result.statusCode).json(result);
    // },

    // async createRegistroMonitoreo(req, res) {
    //     const { data, user } = req.body;
    //     const result = await rndcServiceInstance.createRegistroMonitoreo(data, user);
    //     res.status(result.statusCode).json(result);
    // },

    async consultarManifiesto(req, res) {
        try {
            const result = await rndcServiceInstance.consultarManifiesto();
            res.status(200).json(result);
        } catch (error) {
            console.error('Error in consultarManifiesto controller:', error);
            res.status(500).json({ ok: false, error: 'Internal server error' });
            return;
        }

    }
};

module.exports = rndcController;