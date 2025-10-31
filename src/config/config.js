require('dotenv').config();
module.exports = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'Julian',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'track_transport',
        port: process.env.DB_PORT || 3306,
        connectionLimit: 10

    }
};