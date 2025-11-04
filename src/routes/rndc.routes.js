const express = require('express');
const router = express.Router();
const rndcController = require('../controller/rndc.controller');

router.post('/consultarManifiesto', rndcController.consultarManifiesto);
router.post('/reportarNovedad', rndcController.reportarNovedad);

module.exports = router;