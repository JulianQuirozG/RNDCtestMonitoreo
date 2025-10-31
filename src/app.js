require('dotenv').config();
const express = require('express');

//Importar repositorios y servicios necesarios para el cron
const DbConfig = require('./config/db');
const config = require('./config/config');
const app = express();
const { rndcService } = require('./services/rndc.service');
app.use(express.json());

// Initialize the database connection

(async () => {
    const db = await DbConfig.init(config.database);
    if (!db.status) {
        console.error('Error connecting to the database:', db.message);
    } else {
        console.log('Connected to MySQL database');
    }
})();


// Ruta por defecto
app.get('/', async (req, res) => {
    res.json(await rndcService.puntosCercanosPorViaje());
});


const PORT = config.port || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;