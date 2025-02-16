const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware.authenticate, authController.logout);
router.post('/reset-password', authMiddleware.authenticate,  authController.resetPassword);

module.exports = router;