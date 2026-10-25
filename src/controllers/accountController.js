const { pool } = require('../config/db');

// Get all accounts with customer details
exports.getAllAccounts = async (req, res) => {
    try {
        const { status, account_type, search } = req.query;
        let query = `
            SELECT 
                a.account_number,
                a.customer_id,
                a.account_type,
                a.balance,
                a.status,
                a.created_at,
                c.first_name,
                c.last_name,
                c.email,
                c.phone
            FROM Accounts a
            JOIN Customers c ON a.customer_id = c.customer_id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ` AND a.status = ?`;
            params.push(status);
        }
        if (account_type) {
            query += ` AND a.account_type = ?`;
            params.push(account_type);
        }
        if (search) {
            query += ` AND (a.account_number LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        query += ` ORDER BY a.created_at DESC`;

        const [rows] = await pool.query(query, params);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single account by account_number
exports.getAccountByNumber = async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const [accounts] = await pool.query(`
            SELECT 
                a.*,
                c.first_name,
                c.last_name,
                c.email,
                c.phone,
                c.address
            FROM Accounts a
            JOIN Customers c ON a.customer_id = c.customer_id
            WHERE a.account_number = ?
        `, [accountNumber]);

        if (accounts.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        // Fetch recent transactions for this account
        const [transactions] = await pool.query(`
            SELECT * FROM Transactions 
            WHERE account_number = ? 
            ORDER BY transaction_date DESC, transaction_id DESC 
            LIMIT 20
        `, [accountNumber]);

        res.json({
            success: true,
            data: {
                ...accounts[0],
                transactions
            }
        });
    } catch (error) {
        console.error('Error fetching account details:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create a new account
exports.createAccount = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { customer_id, account_type, initial_balance = 0, status = 'ACTIVE' } = req.body;

        if (!customer_id || !account_type) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID and Account Type (SAVINGS, CHECKING, FIXED_DEPOSIT) are required.'
            });
        }

        const validTypes = ['SAVINGS', 'CHECKING', 'FIXED_DEPOSIT'];
        if (!validTypes.includes(account_type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid account type. Allowed: ${validTypes.join(', ')}`
            });
        }

        const depositAmount = parseFloat(initial_balance) || 0;
        if (depositAmount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Initial balance cannot be negative.'
            });
        }

        await connection.beginTransaction();

        // Check if customer exists
        const [custCheck] = await connection.query('SELECT customer_id FROM Customers WHERE customer_id = ?', [customer_id]);
        if (custCheck.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Customer does not exist' });
        }

        // Insert new account
        const [result] = await connection.query(
            'INSERT INTO Accounts (customer_id, account_type, balance, status) VALUES (?, ?, ?, ?)',
            [customer_id, account_type, depositAmount, status]
        );

        const newAccountNumber = result.insertId;

        // If there is an initial balance, log initial deposit transaction
        if (depositAmount > 0) {
            await connection.query(
                'INSERT INTO Transactions (account_number, transaction_type, amount, balance_after) VALUES (?, ?, ?, ?)',
                [newAccountNumber, 'DEPOSIT', depositAmount, depositAmount]
            );
        }

        await connection.commit();

        const [createdAccount] = await pool.query(`
            SELECT a.*, c.first_name, c.last_name 
            FROM Accounts a 
            JOIN Customers c ON a.customer_id = c.customer_id 
            WHERE a.account_number = ?
        `, [newAccountNumber]);

        res.status(201).json({
            success: true,
            message: 'Account opened successfully',
            data: createdAccount[0]
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating account:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// Update account status
exports.updateAccountStatus = async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const { status } = req.body;

        const validStatuses = ['ACTIVE', 'FROZEN', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed: ${validStatuses.join(', ')}`
            });
        }

        const [existing] = await pool.query('SELECT balance FROM Accounts WHERE account_number = ?', [accountNumber]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        if (status === 'CLOSED' && parseFloat(existing[0].balance) > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot close account with positive balance (₹${existing[0].balance}). Withdraw or transfer funds first.`
            });
        }

        await pool.query('UPDATE Accounts SET status = ? WHERE account_number = ?', [status, accountNumber]);

        res.json({
            success: true,
            message: `Account #${accountNumber} status updated to ${status}`
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
