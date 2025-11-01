const { RNDC_WS_DEMO_URL, nodeEnv } = require('../config/config');
const axios = require('axios');
const RNDCUtils = require('./RNDC.response.util');
const DbConfig = require('../config/db');

class RNDCService {
    constructor() {
        this.rndcWsDemoUrl = RNDC_WS_DEMO_URL;
        //this.rndcWsProduccionUrl = RNDC_WS_PRODUCCION_URL;
        this.entorno = nodeEnv;
    }

    async atenderMensajeRNDC(data, idEmpresa = 1) {

        const empresa = await DbConfig.executeQuery('SELECT * FROM empresas WHERE id = ?', [Number(idEmpresa)]);

        const xml = `<root>
                  <acceso>
                     <username>${empresa.data[0].usuario}</username>
                     <password>${empresa.data[0].contrasen}</password>
                  </acceso>
                 ${data}
                 </root>`;

        console.log('XML Enviado a RNDC:', xml);
        const soapRequest =
            `<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:BPMServicesIntf-IBPMServices">
                <soapenv:Header/>
                <soapenv:Body>
                    <urn:AtenderMensajeBPM soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
                        <urn:Request>${xml}</urn:Request>
                    </urn:AtenderMensajeBPM>
                </soapenv:Body>
            </soapenv:Envelope>`;

        try {

            const response = await axios.post(this.rndcWsDemoUrl, soapRequest, {
                headers: { 'Content-Type': 'text/xml' }
            });
            //console.log("Respuesta Http -: ", response.data);
            return await RNDCUtils.validateRNDCResponse(response.data);

        } catch (error) {

            console.log("Error en el servicio RNDC", error.message);
            return { ok: false, error: error.message };

        }
    }


    async createManifiesto(data, user) {
        try {
            console.log('🚀 Llamando a API RNDC con:', data, user);
            const xmlData = `
                    <solicitud>
                    <tipo>1</tipo>
                    <procesoid>3</procesoid>
                    </solicitud>
                    <variables>
                    <NUMNITEMPRESATRANSPORTE>${data.numnitempresatransporte}</NUMNITEMPRESATRANSPORTE>
                    <CONSECUTIVOREMESA>${data.consecutivoremesa}</CONSECUTIVOREMESA>
                    <CODOPERACIONTRANSPORTE>${data.codoperaciontransporte}</CODOPERACIONTRANSPORTE>
                    <CODNATURALEZACARGA>${data.codnaturalezacarga}</CODNATURALEZACARGA>
                    <CANTIDADCARGADA>${data.cantidadcargada}</CANTIDADCARGADA>
                    <UNIDADMEDIDACAPACIDAD>${data.unidadmedidacapacidad}</UNIDADMEDIDACAPACIDAD>
                    <CODTIPOEMPAQUE>${data.codtipoempaque}</CODTIPOEMPAQUE>
                    <PESOCONTENEDORVACIO>${data.pesocontenedorvacio || 0}</PESOCONTENEDORVACIO>
                    <MERCANCIAREMESA>${data.mercanciaremesa}</MERCANCIAREMESA>
                    <DESCRIPCIONCORTAPRODUCTO>${data.descripcioncortaproducto}</DESCRIPCIONCORTAPRODUCTO>
                     <CODTIPOIDPROPIETARIO>${data.codtipoidpropietario}</CODTIPOIDPROPIETARIO>
                    <NUMIDPROPIETARIO>${data.numidpropietario}</NUMIDPROPIETARIO>
                    <CODSEDEPROPIETARIO>${data.codsedepropietario}</CODSEDEPROPIETARIO>
                    <CODTIPOIDREMITENTE>${data.codtipoidremitente}</CODTIPOIDREMITENTE>
                    <NUMIDREMITENTE>${data.numidremitente}</NUMIDREMITENTE>
                    <CODSEDEREMITENTE>${data.codsederemitente}</CODSEDEREMITENTE>
                    <CODTIPOIDDESTINATARIO>${data.codtipoiddestinatario}</CODTIPOIDDESTINATARIO>
                    <NUMIDDESTINATARIO>${data.numiddestinatario}</NUMIDDESTINATARIO>
                    <CODSEDEDESTINATARIO>${data.codsededestinatario}</CODSEDEDESTINATARIO>
                    <DUENOPOLIZA>${data.duenopoliza}</DUENOPOLIZA>
                    <NUMPOLIZATRANSPORTE>${data.numpolizatransporte}</NUMPOLIZATRANSPORTE>
                    <COMPANIASEGURO>${data.companiaseguro}</COMPANIASEGURO>
                    <FECHAVENCIMIENTOPOLIZACARGA>${data.fechavencimientopolizacarga}</FECHAVENCIMIENTOPOLIZACARGA>
                    <HORASPACTOCARGA>${data.horaspactocarga}</HORASPACTOCARGA>
                    <MINUTOSPACTOCARGA>${data.minutospactocarga}</MINUTOSPACTOCARGA>
                    <HORASPACTODESCARGUE>${data.horaspactodescargue}</HORASPACTODESCARGUE>
                    <MINUTOSPACTODESCARGUE>${data.minutospactodescargue}</MINUTOSPACTODESCARGUE>
                    <FECHACITAPACTADACARGUE>${data.fechacitapactadacargue}</FECHACITAPACTADACARGUE>
                    <HORACITAPACTADACARGUE>${data.horacitapactadacargue}</HORACITAPACTADACARGUE>
                    <FECHACITAPACTADADESCARGUE>${data.fechacitapactadadescargue}</FECHACITAPACTADADESCARGUE>
                    <HORACITAPACTADADESCARGUEREMESA>${data.horacitapactadadescargueremesa}</HORACITAPACTADADESCARGUEREMESA>
                    </variables>`
            console.log('XML Data:', xmlData);
            return { statusCode: 200, data: xmlData };

            const response = await this.atenderMensajeRNDC(xmlData, user.idEmpresa);

            console.log('Response from RNDC:', response);
            if (response.ok) {
                const id_apirndc = await RemesasRepository.save({ identificador_proceso: response.id, idUsuario: user.id, idEmpresa: user.idEmpresa, request: xmlData, response: JSON.stringify(response), status: 200 }, 'crear-remesa');
                return { success: true, data: [{ ...response, id_apirndc }] };
            } else {
                return { success: false, data: [{ ...response, statusCode: 400 }] }
            }
        } catch (error) {
            console.error('Error en RemesasService.create:', error);
            throw { ...error, statusCode: error.statusCode || 500 }
        }
    }

    async createRegistroMonitoreo(data, user) {
        try {
            const dataRMM = data.ROOT.VARIABLES;
            console.log('🚀 Llamando a API RNDC con:', data, user);
            const xmlData = `
                     <SOLICITUD>
                    <TIPO>1</TIPO>
                    <PROCESOID>60</PROCESOID>
                    </SOLICITUD>
                    <VARIABLES>
                    <NUMIDGPS>${dataRMM.NUMIDGPS}</NUMIDGPS>
                    <INGRESOIDMANIFIESTO>${dataRMM.INGRESOIDMANIFIESTO}</INGRESOIDMANIFIESTO>
                    <NUMPLACA>${dataRMM.PLACA}</NUMPLACA>
                    <CODPUNTOCONTROL>${dataRMM.CODPUNTOCONTROL}</CODPUNTOCONTROL>
                    <LATITUD>${dataRMM.LATITUD}</LATITUD>
                    <LONGITUD>${dataRMM.LONGITUD}</LONGITUD>
                    <FECHALLEGADA>${dataRMM.FECHALLEGADA}</FECHALLEGADA>
                    <HORALLEGADA>${dataRMM.HORALLEGADA}</HORALLEGADA>
                    <FECHASALIDA>${dataRMM.FECHASALIDA}</FECHASALIDA>
                    <HORASALIDA>${dataRMM.HORASALIDA}</HORASALIDA>
                    </VARIABLES>`

            console.log('XML Data:', xmlData);

            return { statusCode: 200, data: xmlData };

            const response = await this.atenderMensajeRNDC(xmlData, user.idEmpresa);

            console.log('Response from RNDC:', response);
            if (response.ok) {
                const id_apirndc = await RemesasRepository.save({ identificador_proceso: response.id, idUsuario: user.id, idEmpresa: user.idEmpresa, request: xmlData, response: JSON.stringify(response), status: 200 }, 'crear-remesa');
                return { success: true, data: [{ ...response, id_apirndc }] };
            } else {
                return { success: false, data: [{ ...response, statusCode: 400 }] }
            }
        } catch (error) {
            console.error('Error en RemesasService.create:', error);
            throw { ...error, statusCode: error.statusCode || 500 }
        }
    }

    async createRegistroCargueDescargue(data, user) {
        try {
            const dataRMM = data.ROOT.VARIABLES;
            const xmlData = `
                    <SOLICITUD>
                    <TIPO>1</TIPO>
                    <PROCESOID>60</PROCESOID>
                    </SOLICITUD>
                    <VARIABLES>
                    <NUMIDGPS>${dataRMM.NUMIDGPS}</NUMIDGPS>
                    <INGRESOIDMANIFIESTO>${dataRMM.INGRESOIDMANIFIESTO}</INGRESOIDMANIFIESTO>
                    <NUMPLACA>${dataRMM.PLACA}</NUMPLACA>
                    <CODPUNTOCONTROL>${dataRMM.CODPUNTOCONTROL}</CODPUNTOCONTROL>
                    <LATITUD>${dataRMM.LATITUD}</LATITUD>
                    <LONGITUD>${dataRMM.LONGITUD}</LONGITUD>
                    <FECHALLEGADA>${dataRMM.FECHALLEGADA}</FECHALLEGADA>
                    <HORALLEGADA>${dataRMM.HORALLEGADA}</HORALLEGADA>
                    <FECHASALIDA>${dataRMM.FECHASALIDA}</FECHASALIDA>
                    <HORASALIDA>${dataRMM.HORASALIDA}</HORASALIDA>
                    <FECHAENTRADA>${dataRMM.FECHAENTRADA}</FECHAENTRADA>
                    <HORAENTRADA>${dataRMM.HORAENTRADA}</HORAENTRADA>
                    <TIPOIDCONDUCTOR>${dataRMM.TIPOIDCONDUCTOR}</TIPOIDCONDUCTOR>
                    <NUMIDCONDUCTOR>${dataRMM.NUMIDCONDUCTOR}</NUMIDCONDUCTOR>
                    </VARIABLES>`

            console.log('XML Data:', xmlData);
            return { statusCode: 200, data: xmlData };

            const response = await this.atenderMensajeRNDC(xmlData, user.idEmpresa);

            console.log('Response from RNDC:', response);
            if (response.ok) {
                const id_apirndc = await RemesasRepository.save({ identificador_proceso: response.id, idUsuario: user.id, idEmpresa: user.idEmpresa, request: xmlData, response: JSON.stringify(response), status: 200 }, 'crear-remesa');
                return { success: true, data: [{ ...response, id_apirndc }] };
            } else {
                return { success: false, data: [{ ...response, statusCode: 400 }] }
            }
        } catch (error) {
            console.error('Error en RemesasService.create:', error);
            throw { ...error, statusCode: error.statusCode || 500 }
        }
    }

    async consultarManifiesto() {
        try {
            const xmlData = `
 
                <solicitud>
                    <tipo>3</tipo>
                    <procesoid>4</procesoid>
                </solicitud>
                
                <variables>
                    INGRESOID,FECHAING,NUMNITEMPRESATRANSPORTE,NUMMANIFIESTOCARGA,CONSECUTIVOINFORMACIONVIAJE,MANNROMANIFIESTOTRANSBORDO,CODOPERACIONTRANSPORTE,FECHAEXPEDICIONMANIFIESTO,CODMUNICIPIOORIGENMANIFIESTO,CODMUNICIPIODESTINOMANIFIESTO,CODIDTITULARMANIFIESTO,NUMIDTITULARMANIFIESTO,NUMPLACA,NUMPLACAREMOLQUE,CODIDCONDUCTOR,NUMIDCONDUCTOR,CODIDCONDUCTOR2,NUMIDCONDUCTOR2,VALORFLETEPACTADOVIAJE,RETENCIONFUENTEMANIFIESTO,RETENCIONICAMANIFIESTOCARGA,VALORANTICIPOMANIFIESTO,CODMUNICIPIOPAGOSALDO,CODRESPONSABLEPAGOCARGUE,CODRESPONSABLEPAGODESCARGUE,FECHAPAGOSALDOMANIFIESTO,NITMONITOREOFLOTA,ACEPTACIONELECTRONICA,OBSERVACIONES,TIPOVALORPACTADO,SEGURIDADQR
                </variables>
                <documento>
                    <NUMNITEMPRESATRANSPORTE>9007319718</NUMNITEMPRESATRANSPORTE>
                    <nummanifiestocarga>000012</nummanifiestocarga>

                </documento>`;

            const response = await this.atenderMensajeRNDC(xmlData);

            console.log('Response from RNDC:', response);
            if (response.ok) {
                //const id_apirndc = await RemesasRepository.save({ identificador_proceso: response.id, idUsuario: user.id, idEmpresa: user.idEmpresa, request: xmlData, response: JSON.stringify(response), status: 200 }, 'crear-remesa');
                return { success: true, data: [{ ...response }] };
            } else {
                return { success: false, data: [{ ...response, statusCode: 400 }] }
            }
        } catch (error) {
            console.error('Error en RemesasService.create:', error);
            throw { ...error, statusCode: error.statusCode || 500 }
        }
    }

    async reportarNovedadRndc(data, tipo = 1) {
        try {
            console.log('🚀 Reportando novedad a RNDC con:', data, tipo);
            const xmlData = `
                    <SOLICITUD>
                    <TIPO>1</TIPO>
                    <PROCESOID>46</PROCESOID>
                    </SOLICITUD>
                    <VARIABLES>
                    <NUMIDGPS>${data.NUMIDGPS}</NUMIDGPS>
                    <INGRESOIDMANIFIESTO>${data.INGRESOIDMANIFIESTO}</INGRESOIDMANIFIESTO>
                    <CODPUNTOCONTROL>${data.CODPUNTOCONTROL}</CODPUNTOCONTROL>
                    <NUMPLACA>${data.NUMPLACA}</NUMPLACA>
                    <CODNOVEDAD>${tipo}</CODNOVEDAD>
                    </VARIABLES>`
            //DESCOMENTAR PARA ENVIAR A RNDC
            // const response = await this.atenderMensajeRNDC(xmlData, user.idEmpresa);
            //if (!response.ok) {
            //     return { success: true, data: [{ ...response, id_apirndc }] };
            // } else {
            //     return { success: false, data: [{ ...response, statusCode: 400 }] }
            // }
            //DESCOMENTAR PARA ENVIAR A RNDC
            console.log('XML Data para RNDC:', xmlData);
            return { statusCode: 200, error: false, success: true, message: 'Datos preparados para RNDC', data: xmlData };


            const response = await this.atenderMensajeRNDC(xmlData, user.idEmpresa);
        } catch (error) {
            console.error('Error en reportarNovedadRndc:', error.message);
            return { statusCode: 500, error: true, success: false, message: error.message, data: [] };
        }
    }


}

module.exports = RNDCService;