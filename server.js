const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const socketIo = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const app = express();

// Determine if we should use HTTPS
const useHttps = process.env.NODE_ENV === 'production' || process.env.USE_HTTPS === 'true';

// Async SSL certificate loading
async function createServer() {
  if (useHttps) {
    try {
      const keyPath = process.env.SSL_KEY_PATH;
      const certPath = process.env.SSL_CERT_PATH;
      
      if (keyPath && certPath) {
        const [key, cert] = await Promise.all([
          fs.readFile(keyPath, 'utf8'),
          fs.readFile(certPath, 'utf8')
        ]);
        
        return https.createServer({ key, cert }, app);
      } else {
        console.log('⚠️  HTTPS requested but SSL certificates not found. Falling back to HTTP.');
        return http.createServer(app);
      }
    } catch (error) {
      console.error('Error loading SSL certificates:', error.message);
      console.log('Falling back to HTTP.');
      return http.createServer(app);
    }
  } else {
    return http.createServer(app);
  }
}

// Initialize server
let server;
const serverPromise = createServer().then(s => {
  server = s;
  return s;
});

// CORS configuration - more secure
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true,
  methods: ['GET', 'POST'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Initialize Socket.IO after server is created
let io;
serverPromise.then(serverInstance => {
  io = socketIo(serverInstance, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  // Setup socket handlers after io is initialized
  setupSocketHandlers();
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (useHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Middleware
app.use(compression()); // Enable gzip compression
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.static('public', {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0', // Cache static files in production
  etag: true
}));

// Store active sessions
const sessions = new Map();

// Response cache for API calls (TTL: 5 minutes)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting (simple in-memory store)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

// Spotify API instance manager (reuse instances per token)
const spotifyApiInstances = new Map();

// Spotify API configuration
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || (useHttps ? 'https://localhost:3000/callback' : 'http://localhost:3000/callback')
});

// Get or create Spotify API instance for a token
function getSpotifyApiInstance(accessToken) {
  if (!accessToken) return null;
  
  if (!spotifyApiInstances.has(accessToken)) {
    const api = new SpotifyWebApi({ accessToken });
    spotifyApiInstances.set(accessToken, {
      instance: api,
      createdAt: Date.now()
    });
  }
  
  return spotifyApiInstances.get(accessToken).instance;
}

// Cleanup old API instances (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [token, data] of spotifyApiInstances.entries()) {
    if (now - data.createdAt > maxAge) {
      spotifyApiInstances.delete(token);
    }
  }
}, 10 * 60 * 1000);

// Cache helper functions
function getCacheKey(endpoint, params) {
  return `${endpoint}:${JSON.stringify(params)}`;
}

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Cleanup old cache entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp >= CACHE_TTL) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Rate limiting middleware
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const record = rateLimitStore.get(ip);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.' 
    });
  }
  
  record.count++;
  next();
}

// Cleanup rate limit store (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Input validation middleware
function validateQueryParams(requiredParams) {
  return (req, res, next) => {
    for (const param of requiredParams) {
      if (!req.query[param] || req.query[param].trim() === '') {
        return res.status(400).json({ 
          error: `Missing or empty required parameter: ${param}` 
        });
      }
    }
    next();
  };
}

// Session cleanup (remove inactive sessions older than 1 hour)
setInterval(() => {
  const now = Date.now();
  const maxInactiveTime = 60 * 60 * 1000; // 1 hour
  
  for (const [sessionId, session] of sessions.entries()) {
    if (session.users.length === 0 && (now - session.lastUpdate) > maxInactiveTime) {
      sessions.delete(sessionId);
      console.log(`Cleaned up inactive session: ${sessionId}`);
    }
  }
}, 30 * 60 * 1000); // Run every 30 minutes

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

// Socket.IO connection handling with throttling
function setupSocketHandlers() {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Throttle maps for each socket
  const throttleTimers = new Map();
  const THROTTLE_DELAY = 100; // 100ms throttle for rapid events

  // Throttle helper function
  function throttle(eventName, handler) {
    return (data) => {
      const key = `${socket.id}:${eventName}`;
      
      if (throttleTimers.has(key)) {
        clearTimeout(throttleTimers.get(key));
      }
      
      const timer = setTimeout(() => {
        handler(data);
        throttleTimers.delete(key);
      }, THROTTLE_DELAY);
      
      throttleTimers.set(key, timer);
    };
  }

  // Join a session
  socket.on('join-session', (sessionId) => {
    if (!sessionId || typeof sessionId !== 'string') {
      return socket.emit('error', { message: 'Invalid session ID' });
    }
    
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
    // Check if user already in session
    if (!session.users.find(u => u.id === socket.id)) {
      session.users.push({
        id: socket.id,
        joinedAt: Date.now()
      });
    }
    
    // Send current session state to new user
    socket.emit('session-state', {
      track: session.currentTrack,
      isPlaying: session.isPlaying,
      position: session.position
    });
    
    console.log(`User ${socket.id} joined session ${sessionId}`);
  });

  // Handle play/pause with throttling
  socket.on('play-pause', throttle('play-pause', async (data) => {
    const { sessionId, isPlaying, accessToken } = data;
    if (!sessionId) return;
    
    const session = sessions.get(sessionId);
    if (!session) return;
    
    session.isPlaying = isPlaying;
    session.lastUpdate = Date.now();
    
    // Broadcast to all users in session (except sender)
    socket.to(sessionId).emit('play-pause-update', { isPlaying });
    
    // Update Spotify playback if token provided
    if (accessToken) {
      try {
        const api = getSpotifyApiInstance(accessToken);
        if (api) {
          if (isPlaying) {
            await api.play();
          } else {
            await api.pause();
          }
        }
      } catch (error) {
        console.error('Spotify API error:', error);
        socket.emit('error', { message: 'Failed to control playback' });
      }
    }
  }));

  // Handle track change
  socket.on('change-track', throttle('change-track', async (data) => {
    const { sessionId, trackUri, accessToken } = data;
    if (!sessionId || !trackUri) return;
    
    const session = sessions.get(sessionId);
    if (!session) return;
    
    session.currentTrack = trackUri;
    session.position = 0;
    session.lastUpdate = Date.now();
    
    // Broadcast to all users in session (except sender)
    socket.to(sessionId).emit('track-changed', { trackUri });
    
    // Update Spotify playback if token provided
    if (accessToken && trackUri) {
      try {
        const api = getSpotifyApiInstance(accessToken);
        if (api) {
          await api.play({ uris: [trackUri] });
        }
      } catch (error) {
        console.error('Spotify API error:', error);
        socket.emit('error', { message: 'Failed to change track' });
      }
    }
  }));

  // Handle seek with throttling
  socket.on('seek', throttle('seek', (data) => {
    const { sessionId, position } = data;
    if (!sessionId || typeof position !== 'number') return;
    
    const session = sessions.get(sessionId);
    if (!session) return;
    
    session.position = position;
    session.lastUpdate = Date.now();
    
    // Broadcast to all users in session (except sender)
    socket.to(sessionId).emit('seek-update', { position });
  }));

  // Handle volume change with throttling
  socket.on('volume-change', throttle('volume-change', (data) => {
    const { sessionId, volume } = data;
    if (!sessionId || typeof volume !== 'number') return;
    
    // Broadcast to all users in session (except sender)
    socket.to(sessionId).emit('volume-update', { volume });
  }));

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up throttle timers
    for (const [key] of throttleTimers.entries()) {
      if (key.startsWith(`${socket.id}:`)) {
        clearTimeout(throttleTimers.get(key));
        throttleTimers.delete(key);
      }
    }
    
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
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// API Routes for Spotify with caching and rate limiting
app.get('/api/search', rateLimit, validateQueryParams(['q', 'accessToken']), async (req, res, next) => {
  const { q, accessToken } = req.query;
  const cacheKey = getCacheKey('search', { q: q.trim().toLowerCase(), accessToken });
  
  // Check cache
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const api = getSpotifyApiInstance(accessToken);
    if (!api) {
      return res.status(401).json({ error: 'Invalid access token' });
    }
    
    const results = await api.searchTracks(q.trim(), { limit: 10 });
    const data = results.body;
    
    // Cache the result
    setCache(cacheKey, data);
    
    res.json(data);
  } catch (error) {
    console.error('Search error:', error);
    if (error.statusCode === 401) {
      // Token expired, remove from cache
      spotifyApiInstances.delete(accessToken);
      return res.status(401).json({ error: 'Token expired. Please re-authenticate.' });
    }
    next(error);
  }
});

app.get('/api/current-user', rateLimit, validateQueryParams(['accessToken']), async (req, res, next) => {
  const { accessToken } = req.query;
  const cacheKey = getCacheKey('current-user', { accessToken });
  
  // Check cache (user info changes less frequently, cache for 10 minutes)
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const api = getSpotifyApiInstance(accessToken);
    if (!api) {
      return res.status(401).json({ error: 'Invalid access token' });
    }
    
    const user = await api.getMe();
    const data = user.body;
    
    // Cache the result
    setCache(cacheKey, data);
    
    res.json(data);
  } catch (error) {
    console.error('Get user error:', error);
    if (error.statusCode === 401) {
      spotifyApiInstances.delete(accessToken);
      return res.status(401).json({ error: 'Token expired. Please re-authenticate.' });
    }
    next(error);
  }
});

app.get('/api/playlists', rateLimit, validateQueryParams(['accessToken']), async (req, res, next) => {
  const { accessToken } = req.query;
  const cacheKey = getCacheKey('playlists', { accessToken });
  
  // Check cache
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const api = getSpotifyApiInstance(accessToken);
    if (!api) {
      return res.status(401).json({ error: 'Invalid access token' });
    }
    
    const playlists = await api.getUserPlaylists();
    const data = playlists.body;
    
    // Cache the result
    setCache(cacheKey, data);
    
    res.json(data);
  } catch (error) {
    console.error('Get playlists error:', error);
    if (error.statusCode === 401) {
      spotifyApiInstances.delete(accessToken);
      return res.status(401).json({ error: 'Token expired. Please re-authenticate.' });
    }
    next(error);
  }
});

// Initialize and start server
const PORT = process.env.PORT || 3000;

serverPromise.then(serverInstance => {
  serverInstance.listen(PORT, () => {
    const protocol = useHttps ? 'https' : 'http';
    console.log(`Server running on ${protocol}://localhost:${PORT}`);
    console.log(`Visit ${protocol}://localhost:${PORT} to start the app`);
    console.log(`Spotify redirect URI: ${spotifyApi.getRedirectURI()}`);
    console.log('✅ Performance optimizations enabled:');
    console.log('   - Response caching (5 min TTL)');
    console.log('   - Rate limiting (100 req/min)');
    console.log('   - API instance reuse');
    console.log('   - Request compression');
    console.log('   - Socket event throttling');
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 