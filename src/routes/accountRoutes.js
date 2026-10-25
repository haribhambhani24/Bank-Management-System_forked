const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

router.get('/', accountController.getAllAccounts);
router.get('/:accountNumber', accountController.getAccountByNumber);
router.post('/', accountController.createAccount);
router.patch('/:accountNumber/status', accountController.updateAccountStatus);

module.exports = router;
