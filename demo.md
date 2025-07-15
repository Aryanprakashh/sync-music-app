# Demo Guide - Sync Music App

This guide will help you test the synchronized music listening application.

## Quick Start Demo

### Prerequisites
- Two devices/browsers (or two browser tabs)
- Spotify Premium account
- Spotify API credentials configured

### Step-by-Step Demo

1. **Start the Application**
   ```bash
   npm start
   ```

2. **Open Two Browser Windows**
   - Open `http://localhost:3000` in two different browser windows/tabs
   - This simulates two different users

3. **Authenticate Both Users**
   - In both windows, click "Connect Spotify"
   - Complete the Spotify OAuth flow for both
   - Both users should now see the main application interface

4. **Create a Session**
   - In the first window, click "Create New Session"
   - Copy the generated session ID
   - In the second window, paste the session ID and click "Join Session"
   - Both users should now be in the same session

5. **Test Synchronized Playback**
   - In either window, search for a song (e.g., "Bohemian Rhapsody")
   - Click on a track to start playing
   - Both users should see the same track info and playback state

6. **Test Bidirectional Controls**
   - User 1: Click play/pause - both users should see the change
   - User 2: Click play/pause - both users should see the change
   - User 1: Seek to a different position - both users should see the seek
   - User 2: Change volume - both users should see the volume change

7. **Test Track Changes**
   - User 1: Search for a different song and select it
   - Both users should see the track change and start playing the new song
   - User 2: Search for another song and select it
   - Both users should see the track change again

## Expected Behavior

### Real-time Synchronization
- All playback controls should be synchronized within 1-2 seconds
- Track changes should be immediate
- Progress bar should stay in sync

### User Interface
- Both users should see the same track information
- Album art should display correctly
- Player controls should reflect the current state

### Session Management
- Session ID should be displayed and copyable
- Users should be able to join existing sessions
- Session state should persist for new users joining

## Troubleshooting Demo Issues

### If synchronization doesn't work:
1. Check browser console for errors
2. Ensure both users are in the same session
3. Verify Spotify Premium account is active
4. Check that Spotify app is running on the device

### If authentication fails:
1. Verify Spotify API credentials in `.env` file
2. Check that redirect URI matches exactly
3. Ensure Spotify app is properly configured

### If playback doesn't work:
1. Make sure Spotify desktop app or web player is active
2. Check that you have Spotify Premium
3. Try refreshing the page and re-authenticating

## Advanced Testing

### Multiple Users
- Open more browser windows to test with 3+ users
- Verify all controls work for all users

### Network Conditions
- Test with different network speeds
- Test with one user on mobile hotspot
- Verify reconnection works when network drops

### Edge Cases
- Test what happens when one user disconnects
- Test session behavior when all users leave
- Test with very long song titles or special characters

## Performance Notes

- Initial sync may take 1-2 seconds
- Track changes should be nearly instant
- Volume changes should be immediate
- Seek operations should sync within 500ms

This demo showcases the core functionality of real-time synchronized music listening with bidirectional controls! 