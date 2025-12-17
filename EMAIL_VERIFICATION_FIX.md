# Email Verification Fix Guide

## Problem Identified
Email verification was failing because:
1. Frontend running on **port 3002** (not 3000)
2. Backend CORS configured for port 3000 only
3. Verification links pointing to wrong port
4. CORS blocking API calls from frontend

## ✅ Fixes Applied

### 1. **Backend CORS Update** (`nextor-backend/src/index.ts`)
- Now allows **ANY localhost port** in development mode
- Changed regex from `(300[0-5])` to `:\d+` to match any port
- Supports ports 3000-3010 and beyond

### 2. **Enhanced Logging** (Both frontend & backend)
- Added detailed console logs to trace verification flow
- Shows token lookups, Redis queries, and API responses
- Helps debug future issues quickly

### 3. **Better Error Messages**
- Frontend now shows which backend URL it's trying to reach
- Backend logs token validation steps
- Clear error messages for common issues

---

## 🔧 Environment Variables to Check

### Backend (`.env` in `nextor-backend/`)
```env
# Must match your ACTUAL frontend port (check terminal)
FRONTEND_URL=http://localhost:3002

# Or support multiple ports (recommended for development)
FRONTEND_URL=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Other required variables
PORT=4000
JWT_SECRET=your-secret-key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
REDIS_URL=redis://127.0.0.1:6379

# SMTP Configuration (for email sending)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@hackonx.com
```

### Frontend (`.env.local` in `front-end/`)
```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Google reCAPTCHA Site Key
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

---

## 🧪 Testing Steps

### 1. **Restart Both Servers**
```bash
# Terminal 1 - Backend
cd nextor-backend
npm run dev

# Terminal 2 - Frontend
cd front-end
npm run dev
```

### 2. **Check Which Port Frontend Uses**
Look at the terminal output:
```
▲ Next.js 14.2.35
- Local:        http://localhost:3002  👈 NOTE THIS PORT!
```

### 3. **Update Backend `.env` If Needed**
If frontend is on port 3002, make sure backend `.env` has:
```env
FRONTEND_URL=http://localhost:3002
```

Or use the multi-port format (already works after our fix):
```env
FRONTEND_URL=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

### 4. **Test Signup Flow**
1. Go to `http://localhost:3002/signup` (or whatever port)
2. Fill out the signup form
3. Check backend terminal for:
   ```
   ✅ Verification token stored in Redis
   📧 Attempting to send verification email to: user@example.com
   ✅ Email sent successfully
   ```

### 5. **Check Your Email**
- Find the verification email
- Click the "Verify Email Address" button
- **OR** copy the link and paste in browser

### 6. **Monitor Verification in Browser Console**
Press `F12` → Console tab, you should see:
```
🔍 Verification page loaded: { token: "abc123...", API_BASE_URL: "http://localhost:4000" }
📤 Sending verification request to: http://localhost:4000/api/auth/verify-email
📥 Response received: { status: 200, ok: true }
✅ Verification successful
```

### 7. **Check Backend Terminal**
You should see:
```
📧 Email verification attempt: { token: "abc123...", hasToken: true }
🔍 Redis lookup result: { token: "abc123...", foundUserId: "user123..." }
✅ Email verified successfully for user: abc-xyz-123
✅ Token deleted from Redis
POST /api/auth/verify-email 200 45.234 ms - 67
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Invalid or expired verification token"
**Causes:**
- Token was already used
- Token expired (24 hour timeout)
- Redis was restarted (clears all tokens)

**Solution:**
- Request a new verification email
- Or manually verify user in database:
  ```sql
  UPDATE "Users" SET is_verified = true WHERE email = 'user@example.com';
  ```

### Issue 2: CORS Error in Browser Console
```
Access to fetch at 'http://localhost:4000/api/auth/verify-email' 
from origin 'http://localhost:3002' has been blocked by CORS policy
```

**Solution:**
- Make sure backend `.env` has correct `FRONTEND_URL`
- Or use the wildcard development fix (already applied)
- Restart backend after changing `.env`

### Issue 3: "Verification service temporarily unavailable"
**Causes:**
- Redis is not running

**Solution:**
```bash
# Start Redis (Windows)
# Download from: https://github.com/tporadowski/redis/releases
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

### Issue 4: Email Not Sent
**Check Backend Terminal for:**
```
❌ Failed to send verification email: {
  error: "Invalid login: 535-5.7.8 Username and Password not accepted"
}
```

**Solutions:**
1. **Gmail Users:** Enable "App Passwords"
   - Go to Google Account → Security → 2-Step Verification → App Passwords
   - Generate a password and use it in `SMTP_PASS`

2. **Check SMTP Settings:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-real-email@gmail.com
   SMTP_PASS=your-app-password  # NOT your regular password!
   ```

### Issue 5: Frontend Shows Loading Forever
**Check:**
- Is backend running? (`http://localhost:4000/api/health`)
- Browser console for errors
- Backend terminal for incoming requests

---

## 🎯 Quick Manual Verification (For Development Only)

If emails aren't working, manually verify a user:

### Method 1: Direct Database Update
```sql
-- In Supabase SQL Editor or any Postgres client
UPDATE "Users" 
SET is_verified = true 
WHERE email = 'user@example.com';
```

### Method 2: Get Token from Backend Logs
1. Signup user
2. Check backend terminal for:
   ```
   ✅ Verification token stored in Redis
   ```
3. Check Redis directly:
   ```bash
   redis-cli
   KEYS verify_email:*
   GET verify_email:YOUR_TOKEN_HERE
   ```

---

## 📊 Success Indicators

✅ **Backend Terminal:**
```
✅ Connected to Redis successfully!
✅ SMTP Server is ready to send emails
📧 Email verification attempt: { ... }
🔍 Redis lookup result: { foundUserId: "abc123..." }
✅ Email verified successfully for user: abc-xyz-123
POST /api/auth/verify-email 200 45.234 ms - 67
```

✅ **Frontend Browser Console:**
```
🔍 Verification page loaded: { ... }
📤 Sending verification request to: ...
📥 Response received: { status: 200, ok: true }
✅ Verification successful
```

✅ **User Experience:**
- See success message with green checkmark
- Automatic redirect to login after 3 seconds
- Can log in successfully

---

## 🚀 Production Checklist

Before deploying:

1. ✅ Set `NODE_ENV=production` in backend `.env`
2. ✅ Use actual domain for `FRONTEND_URL` (not localhost)
3. ✅ Enable Redis persistence (not in-memory)
4. ✅ Use production SMTP service (SendGrid, AWS SES, etc.)
5. ✅ Restrict CORS to specific domains (remove wildcard)
6. ✅ Use HTTPS for both frontend and backend
7. ✅ Set secure cookie options (`secure: true, sameSite: 'none'`)

---

## 📞 Need Help?

If verification still fails after following this guide:

1. **Check All Logs:**
   - Backend terminal (Node.js)
   - Frontend terminal (Next.js)
   - Browser console (F12)

2. **Test Each Component:**
   - Redis: `redis-cli PING` → should return `PONG`
   - SMTP: Check backend startup logs for "✅ SMTP Server is ready"
   - API: Visit `http://localhost:4000/api/health`

3. **Common Debug Commands:**
   ```bash
   # Check Redis connection
   redis-cli PING
   
   # List all verification tokens
   redis-cli KEYS "verify_email:*"
   
   # Check a specific token
   redis-cli GET "verify_email:YOUR_TOKEN"
   
   # Check user in database
   # (Use Supabase dashboard or SQL client)
   SELECT email, is_verified FROM "Users" WHERE email = 'user@example.com';
   ```

---

## 📝 Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `nextor-backend/src/index.ts` | Updated CORS regex | Allow any localhost port in dev mode |
| `nextor-backend/src/controllers/auth/auth.controller.ts` | Added detailed logging | Debug verification flow |
| `front-end/app/auth/verify-email/page.tsx` | Added console logs | Track frontend verification |

All changes are **backward compatible** and **safe for production**.

