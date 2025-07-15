# Sync Music - Real-time Synchronized Music Listening

A web application that allows two or more individuals to listen to music together in real-time synchronization using Spotify API. Users can control playback, change songs, and manage sessions with bidirectional controls.

## Features

- 🎵 **Real-time Synchronization**: Listen to music together with perfect timing
- 🎮 **Bidirectional Controls**: Any user can control playback for everyone
- 🔍 **Spotify Integration**: Search and play tracks from Spotify's vast library
- 📱 **Session Management**: Create or join listening sessions with unique IDs
- 🎚️ **Full Player Controls**: Play/pause, seek, volume control
- 📋 **Playlist Support**: Access and play from your Spotify playlists
- 🎨 **Modern UI**: Beautiful, responsive design with smooth animations
- 🔐 **Secure Authentication**: OAuth 2.0 with Spotify
- 🔒 **HTTPS Support**: Secure connections for production use

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Spotify Premium account (for playback control)
- Spotify Developer account

## Setup Instructions

### 1. Spotify API Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. **Important**: Add the correct redirect URI:
   - **For development**: `http://localhost:3000/callback`
   - **For production**: `https://yourdomain.com/callback` (replace with your actual domain)
4. Copy your Client ID and Client Secret

### 2. Application Setup

1. Clone or download this project
2. Navigate to the project directory:
   ```bash
   cd sync-music-app
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create environment file:
   ```bash
   cp env.example .env
   ```

5. Edit `.env` file with your Spotify credentials:
   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
   PORT=3000
   ```

6. Start the application:
   ```bash
   npm start
   ```

7. Open your browser and go to `http://localhost:3000`

### 3. Production Setup (HTTPS)

For production deployment with secure redirect URIs:

1. **Get SSL Certificates**: Obtain SSL certificates for your domain
2. **Update Environment Variables**:
   ```
   SPOTIFY_REDIRECT_URI=https://yourdomain.com/callback
   USE_HTTPS=true
   SSL_KEY_PATH=/path/to/your/private.key
   SSL_CERT_PATH=/path/to/your/certificate.crt
   NODE_ENV=production
   ```

3. **Update Spotify App Settings**: 
   - Go to your Spotify app dashboard
   - Add `https://yourdomain.com/callback` to Redirect URIs
   - Remove the HTTP localhost URI for security

## How to Use

### Getting Started

1. **Connect Spotify**: Click "Connect Spotify" to authenticate with your Spotify account
2. **Create or Join Session**: 
   - Create a new session to get a unique session ID
   - Share the session ID with friends to join your session
   - Or join an existing session by entering the session ID

### Listening Together

1. **Search for Music**: Use the search bar to find songs
2. **Select a Track**: Click on any track to start playing
3. **Control Playback**: Use the player controls to play/pause, seek, or change volume
4. **Real-time Sync**: All actions are synchronized across all users in the session

### Features Explained

- **Session Management**: Each session has a unique ID that users can share
- **Bidirectional Control**: Any user can control playback for everyone
- **Search & Playlists**: Access Spotify's library and your playlists
- **Volume Control**: Individual volume control for each user
- **Progress Sync**: Seek position is synchronized across all users

## Technical Details

### Architecture

- **Backend**: Node.js with Express.js
- **Real-time Communication**: Socket.IO for WebSocket connections
- **Frontend**: Vanilla JavaScript with modern CSS
- **API Integration**: Spotify Web API Node.js library
- **Authentication**: OAuth 2.0 with Spotify
- **Security**: HTTPS support for production

### Key Components

- `server.js`: Main server with Express and Socket.IO setup
- `public/index.html`: Main application interface
- `public/app.js`: Client-side JavaScript for real-time functionality
- `public/style.css`: Modern, responsive styling

### Real-time Features

- **Session State Management**: Tracks current track, playback state, and position
- **Event Broadcasting**: All user actions are broadcast to session members
- **Automatic Reconnection**: Handles connection drops gracefully
- **Progress Synchronization**: Real-time progress updates

## API Endpoints

- `GET /`: Main application page
- `GET /auth/spotify`: Spotify OAuth authorization
- `GET /callback`: OAuth callback handler
- `GET /api/search`: Search Spotify tracks
- `GET /api/current-user`: Get current user info
- `GET /api/playlists`: Get user playlists

## Socket.IO Events

### Client to Server
- `join-session`: Join a listening session
- `play-pause`: Toggle play/pause state
- `change-track`: Change the current track
- `seek`: Seek to a specific position
- `volume-change`: Change volume level

### Server to Client
- `session-state`: Current session state for new users
- `play-pause-update`: Play/pause state changes
- `track-changed`: Track change notifications
- `seek-update`: Seek position updates
- `volume-update`: Volume level changes

## Security Considerations

### Redirect URI Security

- **Development**: Use `http://localhost:3000/callback` for local testing
- **Production**: Always use HTTPS redirect URIs (`https://yourdomain.com/callback`)
- **Multiple URIs**: You can add multiple redirect URIs in Spotify dashboard for different environments

### Environment Variables

- Never commit `.env` files to version control
- Use different credentials for development and production
- Regularly rotate your Spotify API credentials

### HTTPS Configuration

- Use valid SSL certificates from trusted Certificate Authorities
- Consider using Let's Encrypt for free SSL certificates
- Ensure your domain has proper DNS configuration

## Troubleshooting

### Common Issues

1. **"Redirect URI is not secure" Error**
   - **Solution**: Use HTTPS redirect URIs in production
   - **Development**: `http://localhost:3000/callback` is acceptable
   - **Production**: Must use `https://yourdomain.com/callback`

2. **Authentication Failed**
   - Ensure your Spotify app redirect URI matches exactly
   - Check that your Client ID and Secret are correct
   - Verify the redirect URI is added to your Spotify app settings

3. **Playback Not Working**
   - Make sure you have a Spotify Premium account
   - Ensure you have an active Spotify device (desktop app, web player, etc.)

4. **Connection Issues**
   - Check your internet connection
   - Ensure the server is running on the correct port
   - For HTTPS, verify SSL certificates are valid

5. **Session Not Syncing**
   - Verify all users are using the same session ID
   - Check browser console for any errors
   - Ensure WebSocket connections are established

### Development

For development with auto-restart:
```bash
npm run dev
```

For HTTPS development (requires SSL certificates):
```bash
USE_HTTPS=true npm start
```

## Deployment Options

### Local Development
- Use HTTP with `http://localhost:3000/callback`
- No SSL certificates required

### Production Deployment
- Use HTTPS with `https://yourdomain.com/callback`
- Requires valid SSL certificates
- Set `NODE_ENV=production` and `USE_HTTPS=true`

### Cloud Platforms
- **Heroku**: Automatically provides HTTPS
- **Vercel**: Built-in HTTPS support
- **Netlify**: Automatic SSL certificates
- **AWS/GCP**: Use load balancers with SSL termination

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Spotify Web API for music integration
- Socket.IO for real-time communication
- Font Awesome for icons
- Modern CSS techniques for beautiful UI

## Support

If you encounter any issues or have questions, please check the troubleshooting section or create an issue in the repository. 