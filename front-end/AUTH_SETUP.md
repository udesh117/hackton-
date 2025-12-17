# Authentication Setup Guide

This guide explains how to set up and use the authentication pages (Sign Up and Login) in the frontend.

## Environment Variables

Create a `.env.local` file in the `front-end` directory with the following variables:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Google reCAPTCHA Site Key (for signup)
# Get your keys from: https://www.google.com/recaptcha/admin
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```

## Pages Created

1. **Sign Up Page** (`/signup`)
   - Form fields: First Name, Last Name, Email, Password
   - Password validation: Minimum 8 characters, must contain uppercase, lowercase, and number
   - Includes reCAPTCHA v3 verification
   - Redirects to login page after successful signup

2. **Login Page** (`/login`)
   - Form fields: Email, Password
   - Redirects to home page after successful login
   - Includes link to forgot password (page not yet created)

## API Integration

The authentication pages use the backend API endpoints:
- `POST /api/auth/signup` - Create a new account
- `POST /api/auth/login` - Log in to an existing account

The API functions are located in `lib/api.ts`.

## Features

- Form validation (client-side)
- Error handling and display
- Loading states
- Success/error messages
- Cookie-based authentication (handled automatically by the browser)
- reCAPTCHA v3 integration for signup

## Usage

1. Make sure the backend server is running on port 4000 (or update `NEXT_PUBLIC_API_URL`)
2. Set up your reCAPTCHA keys (both site key and secret key)
3. Navigate to `/signup` to create an account or `/login` to log in
4. The home page buttons now link to these pages

## Notes

- After signup, users receive an email verification link
- Users must verify their email before they can log in
- Authentication tokens are stored in HTTP-only cookies for security



