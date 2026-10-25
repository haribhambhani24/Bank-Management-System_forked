const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'BankManagementDB',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00'
});

// Helper function to test DB connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT 1 + 1 AS test');
        const [dbInfo] = await connection.query('SELECT DATABASE() AS current_db, VERSION() AS version');
        const [tables] = await connection.query('SHOW TABLES');
        connection.release();
        return {
            success: true,
            message: 'Successfully connected to MySQL database',
            database: dbInfo[0].current_db,
            version: dbInfo[0].version,
            tableCount: tables.length,
            tables: tables.map(t => Object.values(t)[0])
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
            code: error.code,
            sqlState: error.sqlState
        };
    }
}

module.exports = {
    pool,
    testConnection
};
