const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');
const cors = require('cors');
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const app = express();

// Determine if we should use HTTPS
const useHttps = process.env.NODE_ENV === 'production' || process.env.USE_HTTPS === 'true';
let server;

if (useHttps) {
  // For production, you'll need to provide SSL certificates
  const options = {
    key: process.env.SSL_KEY_PATH ? fs.readFileSync(process.env.SSL_KEY_PATH) : null,
    cert: process.env.SSL_CERT_PATH ? fs.readFileSync(process.env.SSL_CERT_PATH) : null
  };
  
  if (options.key && options.cert) {
    server = https.createServer(options, app);
  } else {
    console.log('⚠️  HTTPS requested but SSL certificates not found. Falling back to HTTP.');
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store active sessions
const sessions = new Map();

// Spotify API configuration
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || (useHttps ? 'https://localhost:3000/callback' : 'http://localhost:3000/callback')
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/auth/spotify', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'playlist-read-private',
    'playlist-read-collaborative'
  ];
  
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  res.redirect(authorizeURL);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;
    
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    
    res.redirect(`/?token=${access_token}`);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.redirect('/?error=auth_failed');
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a session
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        id: sessionId,
        users: [],
        currentTrack: null,
        isPlaying: false,
        position: 0,
        lastUpdate: Date.now()
      });
    }
    
    const session = sessions.get(sessionId);
    session.users.push({
      id: socket.id,
      joinedAt: Date.now()
    });
    
    // Send current session state to new user
    socket.emit('session-state', {
      track: session.currentTrack,
      isPlaying: session.isPlaying,
      position: session.position
    });
    
    console.log(`User ${socket.id} joined session ${sessionId}`);
  });

  // Handle play/pause
  socket.on('play-pause', async (data) => {
    const { sessionId, isPlaying, accessToken } = data;
    const session = sessions.get(sessionId);
    
    if (session) {
      session.isPlaying = isPlaying;
      session.lastUpdate = Date.now();
      
      // Broadcast to all users in session
      socket.to(sessionId).emit('play-pause-update', { isPlaying });
      
      // Update Spotify playback if token provided
      if (accessToken) {
        try {
          const spotifyApi = new SpotifyWebApi({ accessToken });
          if (isPlaying) {
            await spotifyApi.play();
          } else {
            await spotifyApi.pause();
          }
        } catch (error) {
          console.error('Spotify API error:', error);
        }
      }
    }
  });

  // Handle track change
  socket.on('change-track', async (data) => {
    const { sessionId, trackUri, accessToken } = data;
    const session = sessions.get(sessionId);
    
    if (session) {
      session.currentTrack = trackUri;
      session.position = 0;
      session.lastUpdate = Date.now();
      
      // Broadcast to all users in session
      socket.to(sessionId).emit('track-changed', { trackUri });
      
      // Update Spotify playback if token provided
      if (accessToken && trackUri) {
        try {
          const spotifyApi = new SpotifyWebApi({ accessToken });
          await spotifyApi.play({ uris: [trackUri] });
        } catch (error) {
          console.error('Spotify API error:', error);
        }
      }
    }
  });

  // Handle seek
  socket.on('seek', (data) => {
    const { sessionId, position } = data;
    const session = sessions.get(sessionId);
    
    if (session) {
      session.position = position;
      session.lastUpdate = Date.now();
      
      // Broadcast to all users in session
      socket.to(sessionId).emit('seek-update', { position });
    }
  });

  // Handle volume change
  socket.on('volume-change', (data) => {
    const { sessionId, volume } = data;
    
    // Broadcast to all users in session
    socket.to(sessionId).emit('volume-update', { volume });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from all sessions
    sessions.forEach((session, sessionId) => {
      session.users = session.users.filter(user => user.id !== socket.id);
      
      if (session.users.length === 0) {
        sessions.delete(sessionId);
        console.log(`Session ${sessionId} deleted - no users left`);
      }
    });
  });
});

// API Routes for Spotify
app.get('/api/search', async (req, res) => {
  const { q, accessToken } = req.query;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'No access token provided' });
  }
  
  try {
    const spotifyApi = new SpotifyWebApi({ accessToken });
    const results = await spotifyApi.searchTracks(q, { limit: 10 });
    res.json(results.body);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/current-user', async (req, res) => {
  const { accessToken } = req.query;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'No access token provided' });
  }
  
  try {
    const spotifyApi = new SpotifyWebApi({ accessToken });
    const user = await spotifyApi.getMe();
    res.json(user.body);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

app.get('/api/playlists', async (req, res) => {
  const { accessToken } = req.query;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'No access token provided' });
  }
  
  try {
    const spotifyApi = new SpotifyWebApi({ accessToken });
    const playlists = await spotifyApi.getUserPlaylists();
    res.json(playlists.body);
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ error: 'Failed to get playlists' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const protocol = useHttps ? 'https' : 'http';
  console.log(`Server running on ${protocol}://localhost:${PORT}`);
  console.log(`Visit ${protocol}://localhost:${PORT} to start the app`);
  console.log(`Spotify redirect URI: ${spotifyApi.getRedirectURI()}`);
}); 