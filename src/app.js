require('dotenv').config();
const express = require('express');

//Importar repositorios y servicios necesarios para el cron
const DbConfig = require('./config/db');
const config = require('./config/config');
const rndcTestRoutes = require('./routes/rndc.test.routes');
const rndcRoutes = require('./routes/rndc.routes');
const app = express();
const { rndcService } = require('./services/rndc.service');
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para application/x-www-form-urlencoded

// Middleware para parsear XML como texto
app.use(express.text({ 
    type: ['application/xml', 'text/xml', 'application/soap+xml'],
    limit: '10mb'
}));

app.use('/api/rndcTest', rndcTestRoutes);
app.use('/api/rndc', rndcRoutes);

// Initialize the database connection

(async () => {
    const db = await DbConfig.init(config.database);
    if (!db.status) {
        console.error('Error connecting to the database:', db.message);
    } else {
        console.log('Connected to MySQL database');
    }
})();



app.get('/', async (req, res) => {
    res.json(await rndcService.puntosCercanosPorViaje());
});




const PORT = config.port || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;