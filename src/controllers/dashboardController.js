const { pool, testConnection } = require('../config/db');

// Get overall banking dashboard metrics
exports.getDashboardStats = async (req, res) => {
    try {
        // Run aggregated queries in parallel
        const [
            [customerStats],
            [accountStats],
            [typeStats],
            [transfersStats],
            [recentTransactions]
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) AS total_customers FROM Customers'),
            pool.query(`
                SELECT 
                    COUNT(*) AS total_accounts,
                    COALESCE(SUM(balance), 0) AS total_liquidity,
                    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) AS active_accounts,
                    COUNT(CASE WHEN status = 'FROZEN' THEN 1 END) AS frozen_accounts,
                    COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) AS closed_accounts
                FROM Accounts
            `),
            pool.query(`
                SELECT account_type, COUNT(*) AS count, COALESCE(SUM(balance), 0) AS total_balance 
                FROM Accounts 
                GROUP BY account_type
            `),
            pool.query(`
                SELECT 
                    COUNT(*) AS total_transfers,
                    COALESCE(SUM(amount), 0) AS total_transfer_volume
                FROM Transfers
            `),
            pool.query(`
                SELECT 
                    t.transaction_id,
                    t.account_number,
                    t.transaction_type,
                    t.amount,
                    t.balance_after,
                    t.transaction_date,
                    c.first_name,
                    c.last_name
                FROM Transactions t
                JOIN Accounts a ON t.account_number = a.account_number
                JOIN Customers c ON a.customer_id = c.customer_id
                ORDER BY t.transaction_date DESC, t.transaction_id DESC
                LIMIT 6
            `)
        ]);

        res.json({
            success: true,
            data: {
                totalCustomers: customerStats[0].total_customers,
                totalAccounts: accountStats[0].total_accounts,
                activeAccounts: accountStats[0].active_accounts,
                frozenAccounts: accountStats[0].frozen_accounts,
                closedAccounts: accountStats[0].closed_accounts,
                totalLiquidity: parseFloat(accountStats[0].total_liquidity),
                totalTransfers: transfersStats[0].total_transfers,
                totalTransferVolume: parseFloat(transfersStats[0].total_transfer_volume),
                accountTypes: typeStats,
                recentTransactions
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Database connectivity check endpoint
exports.checkHealth = async (req, res) => {
    const health = await testConnection();
    res.status(health.success ? 200 : 500).json(health);
};
