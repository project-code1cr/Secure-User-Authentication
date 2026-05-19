const jwt = require('jsonwebtoken');

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const extractToken = (req) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.split(' ')[1];
};

exports.protect = asyncHandler(async (req, res, next) => {
  // The access token is verified on every protected request and the user context is attached to req.
  const token = extractToken(req);

  if (!token) {
    throw new AppError('Not authorized, token missing', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AppError('User account not found', 401);
    }

    req.user = {
      id: user._id,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };

    next();
  } catch (error) {
    throw new AppError('Not authorized, token invalid or expired', 401);
  }
});

exports.authorizeRoles = (...allowedRoles) => (req, _res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    next(new AppError('You do not have permission to perform this action', 403));
    return;
  }

  next();
};