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



