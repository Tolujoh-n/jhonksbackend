# Deployment Checklist for Forgot Password Fix

## Issues Fixed in Code

1. ✅ **Web Client API URL**: Fixed hardcoded localhost URL to use production backend
2. ✅ **Server MongoDB Connection**: Removed duplicate MongoDB connection that was overriding optimized settings
3. ✅ **CORS Configuration**: Updated to include all necessary origins
4. ✅ **Error Handling**: Improved email error handling for better debugging

## Required Environment Variables on Render.com

Make sure these environment variables are set in your Render dashboard for the backend service:

### Critical Variables:

1. **SMTP_USER**
   - Value: `myjhonks@gmail.com`
   - Purpose: Gmail account for sending password reset emails

2. **SMTP_PASS**
   - Value: `lvptpkovvkghsxcm`
   - Purpose: Gmail app password (not regular password!)
   - ⚠️ **IMPORTANT**: Must be an App Password from Gmail, not your regular password

3. **EMAIL_FROM**
   - Value: `"Jhonks Support" <contact@jhonks.com>` or `"Jhonks Support" <myjhonks@gmail.com>`
   - Purpose: Email sender name and address

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
**Solution:** Check that `SMTP_USER` and `SMTP_PASS` are set in Render environment variables

### Issue: Gmail blocking emails
**Solution:** 
- Ensure you're using an App Password, not your regular Gmail password
- Generate App Password: Google Account → Security → 2-Step Verification → App Passwords
- Make sure "Less secure app access" is enabled (if using older Gmail setup)

### Issue: CORS errors
**Solution:** 
- Verify `CORS_ORIGIN` includes your web client URL
- Check that the web client is calling the correct API URL

### Issue: Email not received
**Solution:**
- Check spam folder
- Verify email address exists in database
- Check Render logs for email sending errors
- Verify SMTP credentials are correct

## Verifying Email Configuration

You can test email configuration by checking Render logs after making a forgot password request. Look for:
- ✅ "Email sending error" - indicates email configuration issue
- ✅ Successful email send confirmation in logs
- ✅ Any nodemailer errors

## Next Steps

1. Set all environment variables on Render
2. Redeploy the backend service
3. Test forgot password from both web and mobile clients
4. Monitor logs for any errors
5. If issues persist, check Render logs for specific error messages

