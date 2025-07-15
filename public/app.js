// Global variables
let socket;
let currentSessionId = null;
let accessToken = null;
let currentTrack = null;
let isPlaying = false;
let currentPosition = 0;
let trackDuration = 0;
let progressInterval = null;
let userInfo = null;

// DOM elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const loadingOverlay = document.getElementById('loading-overlay');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Check for access token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    
    if (error === 'auth_failed') {
        showNotification('Authentication failed. Please try again.', 'error');
    }
    
    if (token) {
        accessToken = token;
        loadUserInfo();
        showApp();
    } else {
        showAuth();
    }
}

function setupEventListeners() {
    // Auth
    document.getElementById('spotify-auth-btn').addEventListener('click', () => {
        window.location.href = '/auth/spotify';
    });
    
    // Session management
    document.getElementById('create-session-btn').addEventListener('click', createSession);
    document.getElementById('join-session-btn').addEventListener('click', joinSession);
    document.getElementById('copy-session-btn').addEventListener('click', copySessionId);
    
    // Player controls
    document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);
    document.getElementById('prev-btn').addEventListener('click', () => changeTrack('prev'));
    document.getElementById('next-btn').addEventListener('click', () => changeTrack('next'));
    
    // Progress bar
    document.querySelector('.progress-bar').addEventListener('click', seekTo);
    
    // Volume
    document.getElementById('volume-slider').addEventListener('input', changeVolume);
    
    // Search
    document.getElementById('search-btn').addEventListener('click', performSearch);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Notification close
    document.getElementById('notification-close').addEventListener('click', hideNotification);
}

// Authentication
function showAuth() {
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
}

function showApp() {
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    initializeSocket();
}

async function loadUserInfo() {
    try {
        showLoading();
        const response = await fetch(`/api/current-user?accessToken=${accessToken}`);
        const user = await response.json();
        
        if (response.ok) {
            userInfo = user;
            updateUserInfo();
            loadPlaylists();
        } else {
            throw new Error('Failed to load user info');
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        showNotification('Failed to load user information', 'error');
    } finally {
        hideLoading();
    }
}

function updateUserInfo() {
    if (userInfo) {
        document.getElementById('user-name').textContent = userInfo.display_name || 'User';
        document.getElementById('user-email').textContent = userInfo.email || '';
        if (userInfo.images && userInfo.images.length > 0) {
            document.getElementById('user-avatar').src = userInfo.images[0].url;
        }
    }
}

// Socket.IO
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('session-state', (state) => {
        console.log('Received session state:', state);
        if (state.track) {
            currentTrack = state.track;
            updateTrackInfo();
        }
        if (state.isPlaying !== undefined) {
            isPlaying = state.isPlaying;
            updatePlayButton();
        }
        if (state.position !== undefined) {
            currentPosition = state.position;
            updateProgress();
        }
    });
    
    socket.on('play-pause-update', (data) => {
        console.log('Play/pause update:', data);
        isPlaying = data.isPlaying;
        updatePlayButton();
        if (isPlaying) {
            startProgressUpdate();
        } else {
            stopProgressUpdate();
        }
    });
    
    socket.on('track-changed', (data) => {
        console.log('Track changed:', data);
        currentTrack = data.trackUri;
        currentPosition = 0;
        updateTrackInfo();
        updateProgress();
        showNotification('Track changed by another user', 'info');
    });
    
    socket.on('seek-update', (data) => {
        console.log('Seek update:', data);
        currentPosition = data.position;
        updateProgress();
    });
    
    socket.on('volume-update', (data) => {
        console.log('Volume update:', data);
        document.getElementById('volume-slider').value = data.volume;
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showNotification('Connection lost. Trying to reconnect...', 'warning');
    });
}

// Session management
function createSession() {
    currentSessionId = generateSessionId();
    joinSessionById(currentSessionId);
    showNotification('New session created!', 'success');
}

function joinSession() {
    const sessionId = document.getElementById('session-id-input').value.trim();
    if (sessionId) {
        joinSessionById(sessionId);
    } else {
        showNotification('Please enter a session ID', 'error');
    }
}

function joinSessionById(sessionId) {
    if (!socket) {
        showNotification('Not connected to server', 'error');
        return;
    }
    
    currentSessionId = sessionId;
    socket.emit('join-session', sessionId);
    
    document.getElementById('current-session-id').textContent = sessionId;
    document.getElementById('session-info').classList.remove('hidden');
    
    showNotification(`Joined session: ${sessionId}`, 'success');
}

function copySessionId() {
    if (currentSessionId) {
        navigator.clipboard.writeText(currentSessionId).then(() => {
            showNotification('Session ID copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy session ID', 'error');
        });
    }
}

function generateSessionId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Player controls
function togglePlayPause() {
    if (!currentSessionId) {
        showNotification('Please join a session first', 'error');
        return;
    }
    
    isPlaying = !isPlaying;
    updatePlayButton();
    
    socket.emit('play-pause', {
        sessionId: currentSessionId,
        isPlaying: isPlaying,
        accessToken: accessToken
    });
    
    if (isPlaying) {
        startProgressUpdate();
    } else {
        stopProgressUpdate();
    }
}

function updatePlayButton() {
    const btn = document.getElementById('play-pause-btn');
    const icon = btn.querySelector('i');
    
    if (isPlaying) {
        icon.className = 'fas fa-pause';
        btn.classList.add('playing');
    } else {
        icon.className = 'fas fa-play';
        btn.classList.remove('playing');
    }
}

function changeTrack(direction) {
    // This would need to be implemented based on your playlist/queue logic
    showNotification(`${direction === 'prev' ? 'Previous' : 'Next'} track functionality coming soon`, 'info');
}

function seekTo(event) {
    if (!currentSessionId || !trackDuration) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newPosition = Math.floor(trackDuration * percentage);
    
    currentPosition = newPosition;
    updateProgress();
    
    socket.emit('seek', {
        sessionId: currentSessionId,
        position: newPosition
    });
}

function changeVolume(event) {
    const volume = event.target.value;
    
    if (currentSessionId) {
        socket.emit('volume-change', {
            sessionId: currentSessionId,
            volume: volume
        });
    }
}

function startProgressUpdate() {
    if (progressInterval) clearInterval(progressInterval);
    
    progressInterval = setInterval(() => {
        if (isPlaying && trackDuration > 0) {
            currentPosition += 1000; // 1 second
            if (currentPosition >= trackDuration) {
                currentPosition = 0;
                stopProgressUpdate();
            }
            updateProgress();
        }
    }, 1000);
}

function stopProgressUpdate() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function updateProgress() {
    const progressFill = document.getElementById('progress-fill');
    const currentTimeSpan = document.getElementById('current-time');
    const totalTimeSpan = document.getElementById('total-time');
    
    if (trackDuration > 0) {
        const percentage = (currentPosition / trackDuration) * 100;
        progressFill.style.width = `${percentage}%`;
    }
    
    currentTimeSpan.textContent = formatTime(currentPosition);
    totalTimeSpan.textContent = formatTime(trackDuration);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Search and playlists
async function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
        showNotification('Please enter a search term', 'error');
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&accessToken=${accessToken}`);
        const data = await response.json();
        
        if (response.ok) {
            displaySearchResults(data.tracks.items);
        } else {
            throw new Error('Search failed');
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Search failed', 'error');
    } finally {
        hideLoading();
    }
}

function displaySearchResults(tracks) {
    const container = document.getElementById('search-results');
    
    if (!tracks || tracks.length === 0) {
        container.innerHTML = '<p class="empty-state">No tracks found</p>';
        return;
    }
    
    container.innerHTML = tracks.map(track => `
        <div class="track-item" onclick="selectTrack('${track.uri}', '${track.name}', '${track.artists[0].name}', '${track.album.name}', '${track.album.images[0]?.url || ''}', ${track.duration_ms})">
            <img src="${track.album.images[0]?.url || 'https://via.placeholder.com/50x50/1db954/ffffff?text=?'}" alt="${track.name}">
            <div class="track-details">
                <h4>${track.name}</h4>
                <p>${track.artists[0].name} • ${track.album.name}</p>
            </div>
        </div>
    `).join('');
}

function selectTrack(uri, name, artist, album, imageUrl, duration) {
    if (!currentSessionId) {
        showNotification('Please join a session first', 'error');
        return;
    }
    
    currentTrack = uri;
    trackDuration = duration;
    currentPosition = 0;
    
    updateTrackInfo(name, artist, album, imageUrl);
    updateProgress();
    
    socket.emit('change-track', {
        sessionId: currentSessionId,
        trackUri: uri,
        accessToken: accessToken
    });
    
    showNotification(`Now playing: ${name}`, 'success');
}

function updateTrackInfo(name = null, artist = null, album = null, imageUrl = null) {
    if (name) {
        document.getElementById('track-title').textContent = name;
        document.getElementById('track-artist').textContent = artist;
        document.getElementById('track-album').textContent = album;
        document.getElementById('album-art').src = imageUrl || 'https://via.placeholder.com/200x200/1db954/ffffff?text=No+Track';
    } else {
        document.getElementById('track-title').textContent = 'No track selected';
        document.getElementById('track-artist').textContent = 'Select a track to start listening';
        document.getElementById('track-album').textContent = '';
        document.getElementById('album-art').src = 'https://via.placeholder.com/200x200/1db954/ffffff?text=No+Track';
    }
}

async function loadPlaylists() {
    try {
        const response = await fetch(`/api/playlists?accessToken=${accessToken}`);
        const data = await response.json();
        
        if (response.ok) {
            displayPlaylists(data.items);
        } else {
            throw new Error('Failed to load playlists');
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
        document.getElementById('playlists-list').innerHTML = '<p class="empty-state">Failed to load playlists</p>';
    }
}

function displayPlaylists(playlists) {
    const container = document.getElementById('playlists-list');
    
    if (!playlists || playlists.length === 0) {
        container.innerHTML = '<p class="empty-state">No playlists found</p>';
        return;
    }
    
    container.innerHTML = playlists.map(playlist => `
        <div class="playlist-item" onclick="selectPlaylist('${playlist.id}', '${playlist.name}')">
            <img src="${playlist.images[0]?.url || 'https://via.placeholder.com/50x50/1db954/ffffff?text=?'}" alt="${playlist.name}">
            <div class="track-details">
                <h4>${playlist.name}</h4>
                <p>${playlist.tracks.total} tracks</p>
            </div>
        </div>
    `).join('');
}

function selectPlaylist(playlistId, playlistName) {
    showNotification(`Playlist "${playlistName}" selected. Track selection coming soon!`, 'info');
    // This would need to be implemented to load playlist tracks
}

// UI helpers
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showNotification(message, type = 'info') {
    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(hideNotification, 5000);
}

function hideNotification() {
    notification.classList.add('hidden');
}

function logout() {
    // Clear all data
    accessToken = null;
    currentSessionId = null;
    currentTrack = null;
    isPlaying = false;
    currentPosition = 0;
    trackDuration = 0;
    userInfo = null;
    
    // Disconnect socket
    if (socket) {
        socket.disconnect();
    }
    
    // Stop progress update
    stopProgressUpdate();
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Show auth screen
    showAuth();
    
    showNotification('Logged out successfully', 'success');
} 