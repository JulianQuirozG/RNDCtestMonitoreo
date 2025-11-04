const express = require('express');
const router = express.Router();
const rndcController = require('../controller/rndc.controller');

router.post('/sincronizar', rndcController.sincronizarRegistrosRNDC);
router.post('/reportarNovedad', rndcController.reportarNovedad);
module.exports = router;