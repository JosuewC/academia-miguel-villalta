const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function query(sqlQuery, params = []) {
    const client = await pool.connect();
    try {
        const result = await client.query(sqlQuery, params);
        return { recordset: result.rows };
    } finally {
        client.release();
    }
}

// Función para obtener conexión (mantener compatibilidad con código existente)
async function getConnection() {
    return null;
}

module.exports = { query, getConnection, sql: null };