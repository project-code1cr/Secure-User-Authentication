const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  generateAccessToken,
  generateRefreshToken,
  generateRandomToken,
  verifyRefreshToken,
} = require('../utils/tokens');
const {
  hashToken,
  calculateExpiryDate,
} = require('../utils/securityTokens');
const { sendMail } = require('../utils/email');

const sanitizeUser = (user) => user.toSafeObject();

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email).toLowerCase());

const validatePasswordStrength = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return false;
  }

  return /[A-Za-z]/.test(password) && /\d/.test(password);
};

const buildAuthPayload = async (user) => {
  // Issue a short-lived access token for request authorization and a long-lived refresh token for session renewal.
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  if (!Array.isArray(user.refreshTokens)) {
    user.refreshTokens = [];
  }

  const tokenHash = hashToken(refreshToken);
  const decodedRefresh = jwt.decode(refreshToken);

  user.refreshTokens.push({
    tokenHash,
    expiresAt: new Date((decodedRefresh.exp || 0) * 1000),
  });

  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  await sendMail({
    to: user.email,
    subject: 'Verify your email address',
    text: `Welcome ${user.name}! Verify your email using this link: ${verificationUrl}`,
    html: `<p>Welcome <strong>${user.name}</strong>!</p><p>Verify your email using this link:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
  });
};

const sendResetPasswordEmail = async (user, token) => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  await sendMail({
    to: user.email,
    subject: 'Reset your password',
    text: `Reset your password using this link: ${resetUrl}`,
    html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', 400);
  }

  if (!isValidEmail(email)) {
    throw new AppError('Please provide a valid email address', 400);
  }

  if (!validatePasswordStrength(password)) {
    throw new AppError('Password must be at least 8 characters long and include letters and numbers', 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new AppError('Email is already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const emailVerificationToken = generateRandomToken();

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    emailVerificationTokenHash: hashToken(emailVerificationToken),
    emailVerificationTokenExpiresAt: calculateExpiryDate(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN || '24h'),
  });

  try {
    await sendVerificationEmail(user, emailVerificationToken);
  } catch (error) {
    console.warn('Email verification message was not sent:', error.message);
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your email before logging in.',
    user: sanitizeUser(user),
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshTokens');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email before logging in', 403);
  }

  const { accessToken, refreshToken } = await buildAuthPayload(user);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  const payload = verifyRefreshToken(refreshToken);

  const user = await User.findById(payload.id).select('+refreshTokens');

  if (!user) {
    throw new AppError('Invalid refresh token', 401);
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = user.refreshTokens.find((item) => item.tokenHash === tokenHash);

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new AppError('Refresh token expired or revoked', 401);
  }

  // Refresh flow keeps the current session alive without exposing the password again.
  const accessToken = generateAccessToken(user);

  res.status(200).json({
    success: true,
    accessToken,
  });
});

exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  const payload = verifyRefreshToken(refreshToken);

  const user = await User.findById(payload.id).select('+refreshTokens');

  if (user) {
    user.refreshTokens = user.refreshTokens.filter((item) => item.tokenHash !== hashToken(refreshToken));
    await user.save({ validateBeforeSave: false });
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    user: sanitizeUser(user),
  });
});

exports.adminDashboard = asyncHandler(async (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin dashboard access granted',
  });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+resetPasswordTokenHash +resetPasswordTokenExpiresAt');

  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If the email exists, a reset link has been sent',
    });
  }

  const resetToken = generateRandomToken();

  user.resetPasswordTokenHash = hashToken(resetToken);
  user.resetPasswordTokenExpiresAt = calculateExpiryDate(process.env.RESET_PASSWORD_TOKEN_EXPIRES_IN || '15m');

  await user.save({ validateBeforeSave: false });

  try {
    await sendResetPasswordEmail(user, resetToken);
  } catch (error) {
    console.warn('Password reset message was not sent:', error.message);
  }

  res.status(200).json({
    success: true,
    message: 'If the email exists, a reset link has been sent',
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || !password) {
    throw new AppError('Reset token and new password are required', 400);
  }

  if (!validatePasswordStrength(password)) {
    throw new AppError('Password must be at least 8 characters long and include letters and numbers', 400);
  }

  const tokenHash = hashToken(token);

  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordTokenExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  user.password = await bcrypt.hash(password, 12);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordTokenExpiresAt = undefined;
  user.refreshTokens = [];

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful. Please log in again.',
  });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new AppError('Verification token is required', 400);
  }

  const tokenHash = hashToken(token);

  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationTokenExpiresAt: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationTokenExpiresAt');

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationTokenExpiresAt = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Email verification successful',
  });
});

exports.resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+emailVerificationTokenHash +emailVerificationTokenExpiresAt');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isEmailVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified',
    });
  }

  const verificationToken = generateRandomToken();
  user.emailVerificationTokenHash = hashToken(verificationToken);
  user.emailVerificationTokenExpiresAt = calculateExpiryDate(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN || '24h');

  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user, verificationToken);
  } catch (error) {
    console.warn('Verification email was not sent:', error.message);
  }

  res.status(200).json({
    success: true,
    message: 'Verification email sent',
  });
});
