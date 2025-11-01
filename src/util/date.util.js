const dateUtils = {
    getDiffDaysByDates: (startDate, endDate) => {
        try{
            const diffTime = Math.abs(startDate - endDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { success: true, error: false, message: 'Date difference calculated successfully', data: diffDays };
        }catch(error){
            console.error('Error calculating date difference:', error);
            return { success: false, error: true, message: 'Error calculating date difference', data: [] };
        }
    }
};

module.exports = { dateUtils };