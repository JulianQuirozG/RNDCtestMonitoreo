const turf = require('@turf/turf');
const turfUtils = {
    getNearestPoint: (point, points) => {
        try {
            //Extraer latitud y longitud del punto
            const puntolat = parseFloat(point.latitud);
            const puntolon = parseFloat(point.longitud);

            if (isNaN(puntolat) || isNaN(puntolon)) {
                console.error('Coordenadas del punto de control inválidas:', point.latitud, point.longitud);
                return { success: false, message: 'Coordenadas del punto de control inválidas' };
            }

            if (!points || points.length <= 0) {
                return { success: false, message: 'No hay coordenadas GPS disponibles' };
            }

            //Crear el punto de control
            const puntoControl = turf.point([puntolon, puntolat]);

            //Crear los puntos de la lista
            const puntos = points.map(coord => { return turf.point([coord.longitud, coord.latitud]) });

            //Encontrar el punto más cercano
            const masCercano = turf.nearestPoint(puntoControl, turf.featureCollection(puntos));

            return { success: true, error: false, message: 'Punto más cercano encontrado', data: masCercano };
        } catch (error) {
            console.error('Error al encontrar el punto más cercano:', error);
            return { error: true, success: false, message: 'Error al encontrar el punto más cercano', data: [] };
        }
    }
};

module.exports = { turfUtils };