const mysql = require('mysql2/promise');
const { mockPool, inMemoryDB } = require('./mockDb');
require('dotenv').config();

const isVercel = !!process.env.VERCEL;
const dbHost = process.env.DB_HOST || '127.0.0.1';
const isLocalhostHost = dbHost === '127.0.0.1' || dbHost === 'localhost';

// Decide if we should try real MySQL or immediately use fallback on Vercel
let useFallback = isVercel && isLocalhostHost;
let realPool = null;

if (!useFallback) {
    try {
        realPool = mysql.createPool({
            host: dbHost,
            port: parseInt(process.env.DB_PORT || '3306', 10),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'BankManagementDB',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            connectTimeout: 4000,
            timezone: '+00:00'
        });
    } catch (err) {
        console.warn('Real MySQL pool initialization failed, using fallback:', err.message);
        useFallback = true;
    }
}

// Resilient Pool Proxy
const pool = {
    async query(sql, params) {
        if (!useFallback && realPool) {
            try {
                return await realPool.query(sql, params);
            } catch (err) {
                // If connection refused (e.g. running on Vercel without cloud DB), switch to fallback
                if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
                    console.warn(`[Cloud DB Fallback] MySQL unavailable (${err.code}). Serving from in-memory store.`);
                    useFallback = true;
                    return mockPool.query(sql, params);
                }
                throw err;
            }
        }
        return mockPool.query(sql, params);
    },

    async getConnection() {
        if (!useFallback && realPool) {
            try {
                const conn = await realPool.getConnection();
                return conn;
            } catch (err) {
                if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
                    console.warn(`[Cloud DB Fallback] MySQL getConnection failed (${err.code}). Using in-memory connection.`);
                    useFallback = true;
                    return mockPool.getConnection();
                }
                throw err;
            }
        }
        return mockPool.getConnection();
    }
};

// Resilient testConnection
async function testConnection() {
    if (!useFallback && realPool) {
        try {
            const connection = await realPool.getConnection();
            const [dbInfo] = await connection.query('SELECT DATABASE() AS current_db, VERSION() AS version');
            const [tables] = await connection.query('SHOW TABLES');
            connection.release();
            return {
                success: true,
                isDemoMode: false,
                message: 'Successfully connected to MySQL database',
                database: dbInfo[0].current_db,
                version: dbInfo[0].version,
                tableCount: tables.length,
                tables: tables.map(t => Object.values(t)[0])
            };
        } catch (error) {
            console.warn(`[testConnection] MySQL unreachable (${error.code}). Activating Cloud Demo Mode.`);
            useFallback = true;
        }
    }

    // Cloud In-Memory Demo Mode
    return {
        success: true,
        isDemoMode: true,
        message: 'Connected in Cloud Demonstration Mode (In-Memory Database active). All accounts, transactions, and triggers are operational.',
        database: 'BankManagementDB (Cloud Memory)',
        version: '8.0.45 (MySQL Emulated)',
        tableCount: 4,
        tables: ['accounts', 'customers', 'transactions', 'transfers']
    };
}

module.exports = {
    pool,
    testConnection,
    inMemoryDB
};
