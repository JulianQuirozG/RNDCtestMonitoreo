const DbConfig = require('../config/db');

const rndcPuntosControlRepository = {
    async createPuntosControl(manifiestoId, punto) {
        try {
            const manifiestoIdDB = Number(manifiestoId);
            const puntoId = Number(punto.codpuntocontrol);
            const latitud = punto.latitud;
            const longitud = punto.longitud;
            const fechaCita = new Date(punto.fechacita);
            const estado = 0;
            const tiempopactado = punto.tiempopactado;
            const codmunicipio = punto.codmunicipio;

            const puntoControl = await DbConfig.executeQuery(`INSERT INTO rndc_puntos_control
            (id_viaje, id_punto, latitud, longitud, fecha_cita, tiempopactado, codmunicipio, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [manifiestoIdDB, puntoId, latitud, longitud, fechaCita, tiempopactado, codmunicipio, estado]);

            if (!puntoControl.success) return { status: false, error: 'Error inserting punto control', data: [] };


            return { success: true, message: 'Punto control created successfully', data: puntoControl };

        } catch (error) {
            console.error('Error in createPuntosControl repository:', error);
            return { success: false, error: true, message: 'Database error', data: [] };
        }
    },

    //Pasos Implementados
    //1. Cambio en la Fecha y Hora del Punto de Control
    //2. Cambio en la Sede del Punto de Control
    //3. Cambio en la Sede y fecha del punto de control
    //4. Anulación del Manifiesto de Carga
    //Pasos por implementar
    //5. Transbordo NO Planeado
    async actualizarAjuste(manifiestoId, punto) {
        try {
            const manifiestoIdRNCD = manifiestoId;

            const manifiestoQuery = await DbConfig.executeQuery(`SELECT * FROM rndc_consultas WHERE numero_manifiesto = ?`, [manifiestoIdRNCD]);
            if (!manifiestoQuery.success || manifiestoQuery.data.length === 0) {
                return { status: false, error: 'Manifiesto no encontrado', data: [] };
            }

            const viaje_id = manifiestoQuery.data[0].id_viaje;
            const puntoId = Number(punto.codpuntocontrol);
            const latitud = punto.latitud;
            const longitud = punto.longitud;
            const fechaCita = new Date(punto.fechacita);
            const estado = 0;
            const tiempopactado = punto.tiempopactado;
            const codmunicipio = punto.codmunicipio;
            const ajuste = Number(punto.ajuste); // 1, 2, 3, 4, 5

            const query = {
                1: `UPDATE rndc_puntos_control SET fecha_cita = ? WHERE id_punto = ? AND id_viaje = ?`,
                2: `UPDATE rndc_puntos_control SET codmunicipio = ?, longitud = ?, latitud = ? WHERE id_punto = ? AND id_viaje = ?`,
                3: `UPDATE rndc_puntos_control SET fecha_cita = ?, codmunicipio = ?, longitud = ?, latitud = ? WHERE id_punto = ? AND id_viaje = ?`,
                4: `UPDATE rndc_consultas SET estado = 3 WHERE numero_manifiesto = ?`,
                //5: `UPDATE rndc_consultas SET estado = 3 WHERE id_manifiesto = ?`
            };

            const data = {
                1: [fechaCita, puntoId, viaje_id],
                2: [puntoId, longitud, latitud, puntoId, viaje_id],
                3: [fechaCita, codmunicipio, longitud, latitud, puntoId, viaje_id],
                4: [manifiestoIdRNCD],
                //5: []
            };

            const actionToDB = DbConfig.executeQuery(query[ajuste], data[ajuste]);

            if (!actionToDB.success) return { status: false, error: 'Error updating ajuste', data: [] };

            return { status: true, message: 'Ajuste updated successfully', data: actionToDB };

        } catch (error) {
            console.error('Error in actualizarAjuste repository:', error);
            return { status: false, error: 'Database error', data: [] };
        }

    },

    async getPuntoDeControl(id_viaje, puntoId) {
        try {
            const punto = await DbConfig.executeQuery(`SELECT * FROM rndc_puntos_control WHERE id_viaje = ? AND id_punto = ?`, [id_viaje, puntoId]);
            return { status: true, message: 'Punto de control retrieved successfully', data: punto.data };
        } catch (error) {
            console.error('Error in getPuntoDeControl repository:', error);
            return { status: false, error: 'Database error', data: [] };
        }
    }
}

module.exports = rndcPuntosControlRepository;