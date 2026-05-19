const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const accessTokenOptions = () => process.env.JWT_EXPIRES_IN || '15m';
const refreshTokenOptions = () => process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

exports.generateAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: accessTokenOptions(),
    }
  );

exports.generateRefreshToken = (user) =>
  jwt.sign(
    {
      id: user._id.toString(),
      type: 'refresh',
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: refreshTokenOptions(),
    }
  );

exports.verifyRefreshToken = (token) => jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

exports.generateRandomToken = () => crypto.randomBytes(32).toString('hex');