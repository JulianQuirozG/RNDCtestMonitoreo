const xml2js = require('xml2js');

const xmlToJson = async (xml) => {
    try {
        const parser = new xml2js.Parser({
            explicitArray: false,    // No crea arrays para elementos únicos
            mergeAttrs: true,        // Fusiona atributos con el contenido del elemento
            ignoreAttrs: false,      // Incluye atributos XML
            trim: true              // Elimina espacios en blanco
        });
        
        const result = await parser.parseStringPromise(xml);
        return result;
    } catch (error) {

        return { error: `Error al convertir XML a JSON: ${error.message}` };
    }
};

// Método alternativo más simple
const xmlToJsonSimple = async (xml) => {
    try {
        const result = await xml2js.parseStringPromise(xml);
        return result;
    } catch (error) {
        return { error: `Error al convertir XML a JSON: ${error.message}` };
    }
};

module.exports = { xmlToJson, xmlToJsonSimple }