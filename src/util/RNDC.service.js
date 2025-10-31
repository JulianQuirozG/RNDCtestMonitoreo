const { RNDC_WS_DEMO_URL, nodeEnv } = require('../config/config');
class RNDCService {
    constructor() {
        this.rndcWsDemoUrl = RNDC_WS_DEMO_URL;
        //this.rndcWsProduccionUrl = RNDC_WS_PRODUCCION_URL;
        this.entorno = nodeEnv;
    }

    async atenderMensajeRNDC(data, idEmpresa) {

        const [empresa] = await db.query('SELECT * FROM empresas WHERE id = ?', [idEmpresa]);

        const xml = `<root>
                  <acceso>
                     <username>${empresa[0].usuarioRndc}</username>
                     <password>${empresa[0].claveRndc}</password>
                  </acceso>
                 ${data}
                 </root>`;
        console.log("xml", xml)
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
            console.log("Respuesta Http -: ", response.data);
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
                    <solicitud>
                    <tipo>1</tipo>
                    <procesoid>3</procesoid>
                    </solicitud>
                    <variables>
                    <NUMIDGPS>${dataRMM.NUMIDGPS}</NUMIDGPS>
                    <INGRESOIDMANIFIESTO>${dataRMM.INGRESOIDMANIFIESTO}</INGRESOIDMANIFIESTO>
                    <CODPUNTOCONTROL>${dataRMM.CODPUNTOCONTROL}</CODPUNTOCONTROL>
                    <LATITUD>${dataRMM.LATITUD}</LATITUD>
                    <LONGITUD>${dataRMM.LONGITUD}</LONGITUD>
                    <PLACA>${dataRMM.PLACA}</PLACA>
                    <FECHALLEGADA>${dataRMM.FECHALLEGADA}</FECHALLEGADA>
                    <HORALLEGADA>${dataRMM.HORALLEGADA}</HORALLEGADA>
                    <FECHASALIDA>${dataRMM.FECHASALIDA}</FECHASALIDA>
                    <HORASALIDA>${dataRMM.HORASALIDA}</HORASALIDA>
                    </variables>`

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
            console.log('🚀 Llamando a API RNDC con:', data, user);
            const xmlData = `
                    <solicitud>
                    <tipo>1</tipo>
                    <procesoid>3</procesoid>
                    </solicitud>
                    <variables>
                    <NUMIDGPS>${dataRMM.NUMIDGPS}</NUMIDGPS>
                    <INGRESOIDMANIFIESTO>${dataRMM.INGRESOIDMANIFIESTO}</INGRESOIDMANIFIESTO>
                    <CODPUNTOCONTROL>${dataRMM.CODPUNTOCONTROL}</CODPUNTOCONTROL>
                    <LATITUD>${dataRMM.LATITUD}</LATITUD>
                    <LONGITUD>${dataRMM.LONGITUD}</LONGITUD>
                    <PLACA>${dataRMM.PLACA}</PLACA>
                    <FECHALLEGADA>${dataRMM.FECHALLEGADA}</FECHALLEGADA>
                    <HORALLEGADA>${dataRMM.HORALLEGADA}</HORALLEGADA>
                    <FECHASALIDA>${dataRMM.FECHASALIDA}</FECHASALIDA>
                    <HORASALIDA>${dataRMM.HORASALIDA}</HORASALIDA>
                    <FECHAENTRADA>${dataRMM.FECHAENTRADA}</FECHAENTRADA>
                    <HORAENTRADA>${dataRMM.HORAENTRADA}</HORAENTRADA>
                    <TIPOIDCONDUCTOR>${dataRMM.TIPOIDCONDUCTOR}</TIPOIDCONDUCTOR>
                    <NUMIDCONDUCTOR>${dataRMM.NUMIDCONDUCTOR}</NUMIDCONDUCTOR>
                    </variables>`

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


}

module.exports = RNDCService;