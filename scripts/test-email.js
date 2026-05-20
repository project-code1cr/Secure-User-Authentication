#!/usr/bin/env node
require('dotenv').config();
const nodemailer = require('nodemailer');

function extractEmail(from) {
  if (!from) return null;
  const m = from.match(/<([^>]+)>/);
  if (m) return m[1];
  if (from.includes('@')) return from;
  return null;
}

const to = process.env.TEST_EMAIL || extractEmail(process.env.SMTP_FROM) || process.env.SMTP_USER;
let host = process.env.SMTP_HOST;
let port = parseInt(process.env.SMTP_PORT || '587', 10);
let secure = (String(process.env.SMTP_SECURE).toLowerCase() === 'true');
let user = process.env.SMTP_USER;
let pass = process.env.SMTP_PASS;
let from = process.env.SMTP_FROM || user;

(async () => {
  try {
    let transporter;

    if (!host || !user || !pass) {
      console.log('No SMTP credentials found — creating Ethereal test account for development.');
      const testAccount = await nodemailer.createTestAccount();
      host = testAccount.smtp.host;
      port = testAccount.smtp.port;
      secure = testAccount.smtp.secure;
      user = testAccount.user;
      pass = testAccount.pass;
      from = from || testAccount.user;
      console.log('Ethereal account created. View credentials in console output.');
      console.log(`Ethereal user: ${testAccount.user}`);
      console.log(`Ethereal pass: ${testAccount.pass}`);
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    // verify connection configuration
    await transporter.verify();
    console.log('SMTP connection OK — sending test message to', to || '(recipient from SMTP_FROM)');

    if (!to) {
      console.log('No TEST_EMAIL set; using', from);
    }

    const info = await transporter.sendMail({
      from: from || user,
      to: to || from,
      subject: 'Secure Auth — test email',
      text: 'This is a test email from your Secure User Authentication System.',
    });

    console.log('Message sent:', info.messageId || info.response || info.accepted);
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log('Preview URL:', preview);
    process.exit(0);
  } catch (err) {
    console.error('Failed to send test email:', err && (err.stack || err.message || err));
    process.exit(1);
  }
})();
