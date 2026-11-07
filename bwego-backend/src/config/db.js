
const mysql = require('mysql2/promise');

// ======================================
// CONFIGURAÇÃO DA BASE DE DADOS BWÉ GO
// ======================================

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',

    port: Number(process.env.DB_PORT || 3306),

    user: process.env.DB_USER || 'root',

    password: process.env.DB_PASSWORD || '',

    database: process.env.DB_NAME || 'bwego',

    waitForConnections: true,

    connectionLimit: 10,

    maxIdle: 10,

    idleTimeout: 60000,

    queueLimit: 0,

    charset: 'utf8mb4',

    timezone: 'Z',

    enableKeepAlive: true,

    keepAliveInitialDelay: 0
});

// ======================================
// EXPORTAR POOL DE CONEXÕES
// ======================================

module.exports = pool;
