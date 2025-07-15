# Security Guide - Redirect URI Configuration

## Understanding the "Redirect URI is not secure" Error

This error occurs when Spotify detects that your redirect URI is not using HTTPS in a production environment. Spotify requires secure redirect URIs to protect user data and prevent security vulnerabilities.

## Quick Fixes

### For Development (Local Testing)
✅ **Use HTTP for localhost** - This is acceptable for development:
```
http://localhost:3000/callback
```

### For Production (Live Deployment)
✅ **Use HTTPS with valid domain** - Required for production:
```
https://yourdomain.com/callback
```

❌ **Don't use HTTP in production** - This will cause the security error:
```
http://yourdomain.com/callback
```

## Step-by-Step Resolution

### 1. Identify Your Environment

**Development (Local)**
- Running on your computer
- Using `localhost` or `127.0.0.1`
- HTTP is acceptable

**Production (Live)**
- Running on a server/cloud platform
- Using a real domain name
- HTTPS is required

### 2. Configure Spotify App Settings

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your application
3. Click "Edit Settings"
4. In "Redirect URIs" section:

   **For Development:**
   ```
   http://localhost:3000/callback
   ```

   **For Production:**
   ```
   https://yourdomain.com/callback
   ```

5. Click "Save"

### 3. Update Your Application

**Development Environment:**
```bash
# .env file
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
USE_HTTPS=false
```

**Production Environment:**
```bash
# .env file
SPOTIFY_REDIRECT_URI=https://yourdomain.com/callback
USE_HTTPS=true
SSL_KEY_PATH=/path/to/private.key
SSL_CERT_PATH=/path/to/certificate.crt
NODE_ENV=production
```

## Common Scenarios

### Scenario 1: Local Development
- ✅ **Correct**: `http://localhost:3000/callback`
- ❌ **Wrong**: `https://localhost:3000/callback` (no SSL cert)

### Scenario 2: Production with Custom Domain
- ✅ **Correct**: `https://myapp.com/callback`
- ❌ **Wrong**: `http://myapp.com/callback`

### Scenario 3: Cloud Platform (Heroku, Vercel, etc.)
- ✅ **Correct**: `https://myapp.herokuapp.com/callback`
- ❌ **Wrong**: `http://myapp.herokuapp.com/callback`

### Scenario 4: Multiple Environments
You can add multiple redirect URIs in Spotify dashboard:
```
http://localhost:3000/callback
https://staging.myapp.com/callback
https://myapp.com/callback
```

## Getting SSL Certificates

### Free Options
1. **Let's Encrypt** - Free, automated SSL certificates
2. **Cloudflare** - Free SSL with their CDN
3. **Cloud Platforms** - Heroku, Vercel, Netlify provide automatic HTTPS

### Paid Options
1. **Commercial CAs** - DigiCert, Comodo, etc.
2. **Cloud Providers** - AWS Certificate Manager, Google Cloud SSL

## Testing Your Configuration

### 1. Check Current Redirect URI
The app will display the current redirect URI when starting:
```bash
npm start
# Output: Spotify redirect URI: https://yourdomain.com/callback
```

### 2. Test Authentication Flow
1. Start the application
2. Click "Connect Spotify"
3. Complete the OAuth flow
4. Verify you're redirected back successfully

### 3. Common Error Messages

**"Redirect URI mismatch"**
- The URI in your app doesn't match Spotify dashboard
- Check both `.env` file and Spotify app settings

**"Redirect URI is not secure"**
- Using HTTP instead of HTTPS in production
- Switch to HTTPS or use localhost for development

**"Invalid redirect URI"**
- URI format is incorrect
- Ensure proper URL format with protocol and path

## Security Best Practices

### 1. Environment Separation
- Use different Spotify apps for development and production
- Never use production credentials in development

### 2. URI Management
- Remove unused redirect URIs from Spotify dashboard
- Regularly audit your redirect URI list
- Use specific URIs, not wildcards

### 3. HTTPS Requirements
- Always use HTTPS in production
- Redirect HTTP to HTTPS
- Use HSTS headers for additional security

### 4. Credential Security
- Never commit `.env` files to version control
- Use environment variables in production
- Rotate credentials regularly

## Troubleshooting Checklist

- [ ] Spotify app redirect URI matches your application
- [ ] Using HTTPS for production domains
- [ ] Using HTTP only for localhost development
- [ ] SSL certificates are valid and trusted
- [ ] Domain DNS is properly configured
- [ ] Environment variables are set correctly
- [ ] Application is running on the correct port
- [ ] No typos in redirect URI

## Need Help?

If you're still experiencing issues:

1. Check the browser console for error messages
2. Verify your Spotify app settings
3. Test with a simple redirect URI first
4. Ensure your domain and SSL certificates are working
5. Check the application logs for detailed error information

Remember: The redirect URI must be **exactly** the same in both your Spotify app settings and your application configuration! 