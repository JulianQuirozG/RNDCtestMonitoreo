const turf = require('@turf/turf');
const turfUtils = {
    /**
     * Encuentra el punto más cercano a un punto de control dentro de una lista de puntos.
     *
     * @param {{latitud: string|number, longitud: string|number}} point - Punto de control.
     * @param {Array<{latitud: number, longitud: number}>} points - Array de coordenadas a comparar.
     * @returns {{success: boolean, error?: boolean, message: string, data: Object|Array}}
     *          Objeto con el resultado. En caso de éxito `data` contiene el Feature del punto más
     *          cercano (GeoJSON). En caso de error o validación fallida, `data` puede ser un array vacío
     *          o no incluirse.
     *
     * @example
     * // Usando strings
     * // turfUtils.getNearestPoint({ latitud: '10.0', longitud: '-75.0' }, [{ latitud: 10.1, longitud: -75.1 }])
     * // -> { success: true, error: false, message: 'Punto más cercano encontrado', data: {...} }
     *
     */
    getNearestPoint: (point, points) => {
        try {
            //Extraer latitud y longitud del punto
            const puntolat = parseFloat(point.latitud);
            const puntolon = parseFloat(point.longitud);

            if (isNaN(puntolat) || isNaN(puntolon)) {
                console.error('Coordenadas del punto de control inválidas:', point.latitud, point.longitud);
                return { success: false, error: false, message: 'Coordenadas del punto de control inválidas', data: [] };
            }

            if (!points || points.length <= 0) {
                return { success: false, error: false, message: 'No hay coordenadas GPS disponibles', data: [] };
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