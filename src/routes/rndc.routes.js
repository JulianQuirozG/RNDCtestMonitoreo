const express = require('express');
const router = express.Router();
const rndcController = require('../controller/rndc.controller');

router.post('/sincronizar', rndcController.sincronizarRegistrosRNDC);

module.exports = router;