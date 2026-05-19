const express = require('express');

const authController = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh-token', authLimiter, authController.refreshToken);
router.post('/logout', authLimiter, authController.logout);
router.get('/profile', protect, authController.getProfile);
router.get('/admin', protect, authorizeRoles('admin'), authController.adminDashboard);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authLimiter, authController.resendVerification);

module.exports = router;