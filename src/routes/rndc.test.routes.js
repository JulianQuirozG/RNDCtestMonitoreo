const express = require('express');
const router = express.Router();
const rndcController = require('../controller/rndc.test.controller');

router.post('/consultarManifiesto', rndcController.consultarManifiesto);
router.post('/consultarManifiestoEMF', rndcController.consultarManifiestoEMF);
router.post('/consultarManifiestosPrueba', rndcController.consultarManifiestosPrueba);

module.exports = router;