const crypto = require('crypto');

exports.hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

exports.compareTokens = (plainToken, hashedToken) =>
  crypto.createHash('sha256').update(plainToken).digest('hex') === hashedToken;

exports.calculateExpiryDate = (duration) => {
  const now = new Date();
  const match = String(duration).trim().match(/^(\d+)([smhd])$/i);

  if (!match) {
    now.setHours(now.getHours() + 24);
    return now;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      now.setSeconds(now.getSeconds() + amount);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + amount);
      break;
    case 'h':
      now.setHours(now.getHours() + amount);
      break;
    case 'd':
      now.setDate(now.getDate() + amount);
      break;
    default:
      now.setHours(now.getHours() + 24);
  }

  return now;
};