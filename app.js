const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(apiLimiter);
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Secure User Authentication System API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      refreshToken: 'POST /api/auth/refresh-token',
      logout: 'POST /api/auth/logout',
      profile: 'GET /api/auth/profile',
      verifyEmail: 'GET /api/auth/verify-email/:token',
      forgotPassword: 'POST /api/auth/forgot-password',
      resetPassword: 'POST /api/auth/reset-password',
    },
  });
});
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Secure User Authentication System is running',
  });
});

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;