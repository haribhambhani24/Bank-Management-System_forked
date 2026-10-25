const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./src/config/db');
const customerRoutes = require('./src/routes/customerRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);

// Database Health Direct Endpoint
app.get('/api/health', async (req, res) => {
    const health = await testConnection();
    res.status(health.success ? 200 : 500).json(health);
});

// Fallback to index.html for Single Page Application view
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error occurred',
        error: err.message
    });
});

// Start Server (only when run directly or not on Vercel)
if (require.main === module || !process.env.VERCEL) {
    app.listen(PORT, async () => {
        console.log(`=======================================================`);
        console.log(`🏦 BANK MANAGEMENT SYSTEM SERVER RUNNING`);
        console.log(`🌐 Localhost Link: http://localhost:${PORT}`);
        console.log(`📡 API Base URL:   http://localhost:${PORT}/api`);
        console.log(`=======================================================`);

        // Run startup DB check
        const health = await testConnection();
        if (health.success) {
            console.log(`✅ Connected to MySQL DB: [${health.database}] on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
            console.log(`📊 Tables verified (${health.tableCount}): ${health.tables.join(', ')}`);
        } else {
            console.error(`❌ Database connection failed:`, health.message);
        }
    });
}

module.exports = app;
