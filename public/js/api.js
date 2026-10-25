// ==========================================================
// AURA BANK - FRONTEND API CLIENT
// ==========================================================

const API_BASE = '/api';

const api = {
    // Dashboard & System Health
    async getStats() {
        const res = await fetch(`${API_BASE}/dashboard/stats`);
        return res.json();
    },

    async getHealth() {
        const res = await fetch(`${API_BASE}/health`);
        return res.json();
    },

    // Customers
    async getCustomers(search = '') {
        const url = search ? `${API_BASE}/customers?search=${encodeURIComponent(search)}` : `${API_BASE}/customers`;
        const res = await fetch(url);
        return res.json();
    },

    async getCustomer(id) {
        const res = await fetch(`${API_BASE}/customers/${id}`);
        return res.json();
    },

    async createCustomer(data) {
        const res = await fetch(`${API_BASE}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async updateCustomer(id, data) {
        const res = await fetch(`${API_BASE}/customers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async deleteCustomer(id) {
        const res = await fetch(`${API_BASE}/customers/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    },

    // Accounts
    async getAccounts({ status = '', account_type = '', search = '' } = {}) {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (account_type) params.append('account_type', account_type);
        if (search) params.append('search', search);

        const res = await fetch(`${API_BASE}/accounts?${params.toString()}`);
        return res.json();
    },

    async getAccount(accountNumber) {
        const res = await fetch(`${API_BASE}/accounts/${accountNumber}`);
        return res.json();
    },

    async createAccount(data) {
        const res = await fetch(`${API_BASE}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async updateAccountStatus(accountNumber, status) {
        const res = await fetch(`${API_BASE}/accounts/${accountNumber}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return res.json();
    },

    // Transactions & Transfers
    async getTransactions({ accountNumber = '', type = '', limit = 50 } = {}) {
        const params = new URLSearchParams();
        if (accountNumber) params.append('accountNumber', accountNumber);
        if (type) params.append('type', type);
        if (limit) params.append('limit', limit);

        const res = await fetch(`${API_BASE}/transactions?${params.toString()}`);
        return res.json();
    },

    async deposit(account_number, amount) {
        const res = await fetch(`${API_BASE}/transactions/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_number, amount })
        });
        return res.json();
    },

    async withdraw(account_number, amount) {
        const res = await fetch(`${API_BASE}/transactions/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_number, amount })
        });
        return res.json();
    },

    async transfer(sender_account, receiver_account, amount) {
        const res = await fetch(`${API_BASE}/transactions/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender_account, receiver_account, amount })
        });
        return res.json();
    },

    async getTransfers() {
        const res = await fetch(`${API_BASE}/transactions/transfers`);
        return res.json();
    }
};

window.api = api;
