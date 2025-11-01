const { xmlToJson } = require('./xmlToJson.js')

const RNDCUtils = {
    validateRNDCResponse: async (response) => {
        const data = await xmlToJson(response);
        console.log('data', data);
        /*console.log('data1', data['SOAP-ENV:Envelope']['SOAP-ENV:Body']['NS1:AtenderMensajeBPMResponse']);
        console.log('data1.2', data['SOAP-ENV:Envelope']['SOAP-ENV:Body']['NS1:AtenderMensajeBPMResponse'].return['_']);*/
        const data3 = await xmlToJson(data['SOAP-ENV:Envelope']['SOAP-ENV:Body']['NS1:AtenderMensajeBPMResponse'].return['_']);
        console.log('data3', data3);
        const root = data3?.root;

        if (root?.ingresoid)
            return { ok: true, id: root.ingresoid, data: data3 };
        if (root?.documento?.ingresoid)
            return { ok: true, id: root.documento.ingresoid, data: data3 };
        if (root?.ErrorMSG)
            return { ok: false, error: root.ErrorMSG }
        return { ok: false, error: 'Respuesta no valida' }

    }
};

module.exports = RNDCUtils;