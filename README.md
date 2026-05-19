# Secure User Authentication System

Production-ready authentication backend built with Node.js, Express.js, MongoDB, JWT, bcrypt.js, email verification, refresh tokens, and protected routes.

GitHub description:
Secure backend authentication system with JWT, bcrypt, role-based access control, refresh tokens, password reset, email verification, security middleware, and automated tests.

## Overview

This project provides a clean MVC-based authentication backend with registration, login, protected routes, refresh tokens, role-based access control, password reset, and email verification support. It also includes security middleware and automated tests.

## Features

- User registration and login
- JWT access tokens and refresh token support
- Password hashing with bcrypt.js
- Protected profile route
- Role-based access control for admin and user roles
- Email verification support
- Forgot and reset password APIs
- Logout with refresh-token revocation
- Security middleware with helmet, CORS, and rate limiting

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt.js
- dotenv
- cors
- helmet
- express-rate-limit

## Project Structure

```text
controllers/
routes/
middleware/
models/
utils/
config/
server.js
app.js
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and update the values for your local environment.

```bash
copy .env.example .env
```

3. Keep `.env` local only. Do not commit it to GitHub.

4. Start MongoDB locally or provide a cloud MongoDB URI.

5. Run the server:

```bash
npm run dev
```

6. Run tests:

```bash
npm test
```

## Environment Files

- `.env.example` is committed and contains placeholder values.
- `.env` is your local secret file and is ignored by Git.
- If you are deploying, set these values in your hosting provider's environment variables.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Access token secret |
| `JWT_EXPIRES_IN` | Access token lifetime |
| `REFRESH_TOKEN_SECRET` | Refresh token secret |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifetime |
| `CLIENT_URL` | Frontend base URL |
| `SMTP_*` | Email delivery settings |

## API Endpoints

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `GET /api/auth/profile`
- `GET /api/auth/admin`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`
- `GET /api/auth/verify-email/:token`
- `POST /api/auth/resend-verification`

## Example Requests

### Register

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123"
}
```

### Login

```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

### Protected Request

```http
GET /api/auth/profile
Authorization: Bearer <access_token>
```

## Deployment

### Render / Railway

1. Push the repository to GitHub.
2. Create a new web service on Render or Railway.
3. Set `NODE_ENV=production` and configure the environment variables.
4. Add the MongoDB connection string from MongoDB Atlas.
5. Deploy using the `npm start` command.

## Notes

- Registration requires email verification before login.
- Refresh tokens are stored hashed in MongoDB.
- Password reset and verification links are designed to work with an email frontend flow.
- For production, configure SMTP and rotate any exposed database credentials before publishing.