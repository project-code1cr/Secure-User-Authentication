require('dotenv').config();

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

const User = require('../models/User');
const { generateRandomToken } = require('../utils/tokens');
const { hashToken, calculateExpiryDate } = require('../utils/securityTokens');

jest.setTimeout(120000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  // Load app after setting env
  app = require('../app');
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  await User.deleteMany({});
});

test('full auth flow: register -> verify -> login -> profile -> refresh -> logout', async () => {
  const agent = request(app);

  // register
  const registerRes = await agent.post('/api/auth/register').send({
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'Password123',
  });

  expect(registerRes.status).toBe(201);
  expect(registerRes.body.success).toBe(true);

  // find user and set verification token
  const user = await User.findOne({ email: 'testuser@example.com' }).select('+emailVerificationTokenHash');
  expect(user).toBeTruthy();

  const token = generateRandomToken();
  user.emailVerificationTokenHash = hashToken(token);
  user.emailVerificationTokenExpiresAt = calculateExpiryDate('24h');
  await user.save({ validateBeforeSave: false });

  // verify
  const verifyRes = await agent.get(`/api/auth/verify-email/${token}`);
  expect(verifyRes.status).toBe(200);
  expect(verifyRes.body.success).toBe(true);

  // login
  const loginRes = await agent.post('/api/auth/login').send({
    email: 'testuser@example.com',
    password: 'Password123',
  });

  expect(loginRes.status).toBe(200);
  expect(loginRes.body.accessToken).toBeTruthy();
  expect(loginRes.body.refreshToken).toBeTruthy();

  const { accessToken, refreshToken } = loginRes.body;

  // profile
  const profileRes = await agent.get('/api/auth/profile').set('Authorization', `Bearer ${accessToken}`);
  expect(profileRes.status).toBe(200);
  expect(profileRes.body.user.email).toBe('testuser@example.com');

  // refresh
  const refreshRes = await agent.post('/api/auth/refresh-token').send({ refreshToken });
  expect(refreshRes.status).toBe(200);
  expect(refreshRes.body.accessToken).toBeTruthy();

  // logout
  const logoutRes = await agent.post('/api/auth/logout').send({ refreshToken });
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.success).toBe(true);
});
