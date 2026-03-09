# Deployment Checklist for Forgot Password Fix

## Issues Fixed in Code

1. ✅ **Web Client API URL**: Fixed hardcoded localhost URL to use production backend
2. ✅ **Server MongoDB Connection**: Removed duplicate MongoDB connection that was overriding optimized settings
3. ✅ **CORS Configuration**: Updated to include all necessary origins
4. ✅ **Error Handling**: Improved email error handling for better debugging

## Required Environment Variables on Render.com

Make sure these environment variables are set in your Render dashboard for the backend service:

### Critical Variables (Password reset uses Resend, not Gmail SMTP):

1. **RESEND_API_KEY**
   - Value: Your API key from [Resend](https://resend.com/api-keys) (e.g. `re_xxxxx`)
   - Purpose: Required for sending password reset emails. **Without this, password reset will fail on mobile** (and any client hitting this backend).

2. **EMAIL_FROM**
   - Value: `Jhonks Support <onboarding@resend.dev>` (for testing), or a verified domain sender (e.g. `Jhonks Support <noreply@yourdomain.com>`)
   - Purpose: Sender shown on password reset emails. Use a [verified domain](https://resend.com/domains) in production.

4. **MONGODB_URI**
   - Value: Your MongoDB Atlas connection string
   - Example: `mongodb+srv://jhonks:50nULv9P5ykEOA31@jhonks.2ssgzoz.mongodb.net/?retryWrites=true&w=majority&appName=jhonks`

5. **CORS_ORIGIN**
   - Value: `https://app.jhonks.com,http://localhost:3000,http://localhost:8081,https://jhonksbackend.onrender.com`
   - Purpose: Allowed origins for CORS requests
   - ⚠️ Include your deployed web client URL if different from `https://app.jhonks.com`

6. **JWT_SECRET**
   - Value: A strong random string (change from default)
   - Purpose: JWT token signing

7. **NODE_ENV**
   - Value: `production`
   - Purpose: Sets production mode

### How to Set Environment Variables on Render:

1. Go to your Render dashboard
2. Select your backend service
3. Click on "Environment" tab
4. Add each variable above
5. Save and redeploy

## Testing Steps

After deploying:

1. **Test the forgot password endpoint directly:**
   ```bash
   curl -X POST https://jhonksbackend.onrender.com/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Check server logs on Render:**
   - Look for any email sending errors
   - Check for missing environment variables
   - Verify MongoDB connection

3. **Test from web client:**
   - Ensure web client is using production API URL
   - Try forgot password flow
   - Check browser console for errors

4. **Test from mobile app:**
   - Mobile app should already be using production URL
   - Try forgot password flow
   - Check for any network errors

## Common Issues and Solutions

### Issue: "Email service credentials are not configured"
**Solution:** Check that `RESEND_API_KEY` and `EMAIL_FROM` are set in Render environment variables. Password reset uses Resend, not Gmail SMTP.

### Issue: CORS errors
**Solution:** 
- Verify `CORS_ORIGIN` includes your web client URL
- Check that the web client is calling the correct API URL

### Issue: Email not received / "We were unable to send the reset email" on mobile
**Solution:**
- **Mobile uses the production backend (Render).** If password reset works on web (localhost) but not on mobile, the production server likely has no Resend config.
- Set on Render: `RESEND_API_KEY` (from resend.com) and `EMAIL_FROM` (e.g. `Jhonks Support <onboarding@resend.dev>` for testing).
- Check spam folder; verify email exists in database; check Render logs for "Email sending error".

## Verifying Email Configuration

After a forgot-password request, check Render logs for:
- "Email sending error" → Resend not configured or domain not verified
- Successful send → no error log

## Next Steps

1. Set all environment variables on Render
2. Redeploy the backend service
3. Test forgot password from both web and mobile clients
4. Monitor logs for any errors
5. If issues persist, check Render logs for specific error messages

