# 🚀 Deployment Guide - Sync Music App

This guide will help you deploy your synchronized music application to various platforms.

## Quick Deploy Options

### 1. 🎯 Heroku (Recommended - Easiest)

**Prerequisites:**
- Heroku account (free)
- Git installed
- Heroku CLI (optional)

**Steps:**

1. **Install Heroku CLI** (if not installed):
   ```bash
   # Windows
   winget install --id=Heroku.HerokuCLI
   
   # Or download from: https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**:
   ```bash
   heroku login
   ```

3. **Create Heroku App**:
   ```bash
   heroku create your-sync-music-app
   ```

4. **Set Environment Variables**:
   ```bash
   heroku config:set SPOTIFY_CLIENT_ID=your_client_id
   heroku config:set SPOTIFY_CLIENT_SECRET=your_client_secret
   heroku config:set SPOTIFY_REDIRECT_URI=https://your-app-name.herokuapp.com/callback
   heroku config:set NODE_ENV=production
   ```

5. **Deploy**:
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push heroku main
   ```

6. **Open Your App**:
   ```bash
   heroku open
   ```

### 2. 🌐 Vercel (Fast & Free)

**Prerequisites:**
- Vercel account (free)
- Git repository

**Steps:**

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/sync-music-app.git
   git push -u origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set environment variables:
     - `SPOTIFY_CLIENT_ID`
     - `SPOTIFY_CLIENT_SECRET`
     - `SPOTIFY_REDIRECT_URI` (https://your-app.vercel.app/callback)

3. **Deploy**:
   - Vercel will automatically deploy your app
   - Get your live URL

### 3. ☁️ Railway (Simple & Fast)

**Steps:**

1. **Go to Railway**:
   - Visit [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Environment**:
   - Add environment variables in Railway dashboard
   - Set your Spotify credentials

### 4. 🐳 Docker Deployment

**Create Dockerfile:**
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

**Deploy with Docker:**
```bash
# Build image
docker build -t sync-music-app .

# Run container
docker run -p 3000:3000 -e SPOTIFY_CLIENT_ID=your_id -e SPOTIFY_CLIENT_SECRET=your_secret sync-music-app
```

## Environment Configuration

### Required Environment Variables

```bash
# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://yourdomain.com/callback

# Server
PORT=3000
NODE_ENV=production
```

### Platform-Specific Setup

#### Heroku
```bash
heroku config:set SPOTIFY_CLIENT_ID=your_id
heroku config:set SPOTIFY_CLIENT_SECRET=your_secret
heroku config:set SPOTIFY_REDIRECT_URI=https://your-app.herokuapp.com/callback
```

#### Vercel
- Add in Vercel dashboard → Settings → Environment Variables

#### Railway
- Add in Railway dashboard → Variables tab

## Spotify App Configuration

### Update Redirect URIs

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click "Edit Settings"
4. Add your production redirect URI:
   - **Heroku**: `https://your-app-name.herokuapp.com/callback`
   - **Vercel**: `https://your-app.vercel.app/callback`
   - **Railway**: `https://your-app.railway.app/callback`
   - **Custom Domain**: `https://yourdomain.com/callback`

5. Remove development URIs for security

## Post-Deployment Checklist

- [ ] App is accessible via HTTPS
- [ ] Spotify authentication works
- [ ] Real-time features function properly
- [ ] Environment variables are set correctly
- [ ] Redirect URI matches exactly
- [ ] SSL certificates are valid (if custom domain)

## Troubleshooting Deployment

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check for syntax errors

2. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify Spotify credentials are correct

3. **Redirect URI Errors**
   - Update Spotify app settings with production URI
   - Ensure HTTPS is used for production
   - Check for exact URI matching

4. **Socket.IO Issues**
   - Verify WebSocket connections work
   - Check for CORS configuration
   - Ensure proper port configuration

### Debug Commands

```bash
# Check logs (Heroku)
heroku logs --tail

# Check logs (Railway)
railway logs

# Check environment variables
heroku config

# Restart app
heroku restart
```

## Performance Optimization

### Production Settings

1. **Enable Compression**:
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Set Security Headers**:
   ```javascript
   app.use(helmet());
   ```

3. **Enable Caching**:
   ```javascript
   app.use(express.static('public', { maxAge: '1h' }));
   ```

## Monitoring & Maintenance

### Health Checks

Add a health check endpoint:
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
```

### Logging

```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

## Cost Considerations

### Free Tiers

- **Heroku**: Free tier discontinued, paid plans start at $7/month
- **Vercel**: Free tier with generous limits
- **Railway**: Free tier with usage limits
- **Netlify**: Free tier available

### Scaling Options

- Start with free tiers
- Monitor usage and performance
- Upgrade as needed based on user growth

## Security Best Practices

1. **Environment Variables**: Never commit secrets to Git
2. **HTTPS Only**: Always use HTTPS in production
3. **Regular Updates**: Keep dependencies updated
4. **Access Control**: Limit admin access
5. **Monitoring**: Set up alerts for issues

## Support & Resources

- **Heroku**: [Dev Center](https://devcenter.heroku.com/)
- **Vercel**: [Documentation](https://vercel.com/docs)
- **Railway**: [Docs](https://docs.railway.app/)
- **Spotify API**: [Developer Portal](https://developer.spotify.com/)

Your app is now ready for deployment! Choose the platform that best fits your needs and follow the steps above. 