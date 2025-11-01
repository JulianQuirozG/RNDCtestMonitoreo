const dateUtils = {
    /**
     * Calcula la diferencia en días entre dos fechas.
     *
     * @param {Date|number} startDate - Fecha de inicio (Date o timestamp en ms).
     * @param {Date|number} endDate - Fecha de fin (Date o timestamp en ms).
     * @returns {{success: boolean, error: boolean, message: string, data: number|Array}} Objeto con el resultado.
     *          En caso de éxito `data` contiene el número de días .
     *          En caso de error, `data` es un array vacío.
     *
     * @example
     * // Usando objetos Date
     * // dateUtils.getDiffDaysByDates(new Date('2025-10-01'), new Date('2025-10-05'))
     * // -> { success: true, error: false, message: 'Date difference calculated successfully', data: 4 }
     *
     */
    getDiffDaysByDates: (startDate, endDate) => {
        try{
            const diffTime = Math.abs(startDate - endDate);
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            return { success: true, error: false, message: 'Date difference calculated successfully', data: diffDays };
        }catch(error){
            console.error('Error calculating date difference:', error);
            return { success: false, error: true, message: 'Error calculating date difference', data: [] };
        }
    }
};

module.exports = { dateUtils };