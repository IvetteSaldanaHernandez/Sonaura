import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PlaylistView.css';

const PlaylistView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { playlist, sectionType, recommendationReason, moodColor } = location.state || {};
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Mock data for demonstration - in real app, you'd fetch this from Spotify API
  const mockTracks = [
    { name: "Study Session", artist: "Lo-Fi Beats", duration: "3:45" },
    { name: "Deep Focus", artist: "Ambient Study", duration: "4:20" },
    { name: "Concentration Flow", artist: "Chillhop", duration: "3:15" },
    { name: "Productivity Boost", artist: "Focus Music", duration: "5:10" },
    { name: "Mindful Coding", artist: "Study Vibes", duration: "3:55" }
  ];

  const totalDuration = "20:25"; // Mock total duration

  const handleSaveToSpotify = async () => {
    const token = localStorage.getItem('jwt_token');
    const spotifyToken = localStorage.getItem('spotify_token');
    
    if (!token || !spotifyToken) {
      setSaveStatus('Please connect your Spotify account first');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus('Saving to Spotify...');

    try {
      // In a real implementation, you would:
      // 1. Create a new playlist in the user's Spotify account
      // 2. Add the tracks to the playlist
      
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful save
      setSaveStatus('✅ Playlist saved to Spotify!');
      setTimeout(() => setSaveStatus(''), 3000);
      
    } catch (error) {
      console.error('Error saving playlist:', error);
      setSaveStatus('❌ Failed to save playlist');
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const createSpotifyPlaylist = async (playlistName, trackUris) => {
    // This is where you would implement the actual Spotify API calls:
    
    // 1. Get current user's Spotify ID
    // const userResponse = await axios.get('https://api.spotify.com/v1/me', {
    //   headers: { Authorization: `Bearer ${spotifyToken}` }
    // });
    // const userId = userResponse.data.id;
    
    // 2. Create a new playlist
    // const playlistResponse = await axios.post(
    //   `https://api.spotify.com/v1/users/${userId}/playlists`,
    //   {
    //     name: playlistName,
    //     description: `Created via StudySound - ${recommendationReason}`,
    //     public: false
    //   },
    //   { headers: { Authorization: `Bearer ${spotifyToken}` } }
    // );
    // const playlistId = playlistResponse.data.id;
    
    // 3. Add tracks to the playlist
    // await axios.post(
    //   `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    //   { uris: trackUris },
    //   { headers: { Authorization: `Bearer ${spotifyToken}` } }
    // );
    
    return true; // Mock success
  };

  if (!playlist) {
    return (
      <div className="playlist-view">
        <div className="playlist-error">
          <h2>Playlist not found</h2>
          <button onClick={() => navigate('/activity')}>Back to Activity</button>
        </div>
      </div>
    );
  }

  return (
    <div className="playlist-view">
      <button className="back-button" onClick={() => navigate(sectionType === 'mood' ? '/mood' : '/activity')}>
        ← Back to {sectionType === 'mood' ? 'Mood' : 'Activity'}
      </button>

      <div className="playlist-header">
        <div 
          className="playlist-cover"
          style={{ 
            backgroundImage: `url(${playlist.image})`,
            border: moodColor ? `4px solid ${moodColor}` : 'none'
          }}
        >
          {!playlist.image && <div className="cover-placeholder">🎵</div>}
        </div>
        
        <div className="playlist-info">
          <h1 className="playlist-title">{playlist.title}</h1>
          <p className="playlist-artist">{playlist.artist}</p>
          <div className="playlist-meta">
            <span className="meta-item">
              <strong>{mockTracks.length}</strong> songs
            </span>
            <span className="meta-item">
              <strong>{totalDuration}</strong> total
            </span>
            {moodColor && (
              <span 
                className="mood-indicator"
                style={{ backgroundColor: moodColor }}
              >
                Mood Playlist
              </span>
            )}
          </div>
          <div className="recommendation-reason">
            <span className="reason-badge">{recommendationReason}</span>
          </div>
          
          {/* Save to Spotify Button */}
          <div className="action-buttons">
            <button 
              className={`save-to-spotify-btn ${isSaving ? 'saving' : ''}`}
              onClick={handleSaveToSpotify}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="spinner"></div>
                  Saving...
                </>
              ) : (
                <>
                  <span className="spotify-icon">🎵</span>
                  Save to Spotify
                </>
              )}
            </button>
            {saveStatus && (
              <div className={`save-status ${saveStatus.includes('✅') ? 'success' : 'error'}`}>
                {saveStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="playlist-details">
        <div className="tracks-section">
          <h2>Tracks</h2>
          <div className="tracks-list">
            {mockTracks.map((track, index) => (
              <div key={index} className="track-item">
                <div className="track-number">{index + 1}</div>
                <div className="track-info">
                  <div className="track-name">{track.name}</div>
                  <div className="track-artist">{track.artist}</div>
                </div>
                <div className="track-duration">{track.duration}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="playlist-insights">
          <h2>Why this playlist?</h2>
          <div className="insight-card">
            <p>{recommendationReason}</p>
            <ul className="insight-list">
              <li>Perfect for focused study sessions</li>
              <li>Matches your recent listening patterns</li>
              <li>Curated based on your preferences</li>
            </ul>
          </div>
          
          <div className="playlist-stats">
            <h3>Playlist Stats</h3>
            <div className="stats-grid">
              <div className="stat">
                <div className="stat-value">{mockTracks.length}</div>
                <div className="stat-label">Tracks</div>
              </div>
              <div className="stat">
                <div className="stat-value">{totalDuration}</div>
                <div className="stat-label">Duration</div>
              </div>
              <div className="stat">
                <div className="stat-value">Study</div>
                <div className="stat-label">Focus</div>
              </div>
            </div>
          </div>

          {/* Spotify Integration Info */}
          <div className="spotify-info">
            <h3>Save to Your Library</h3>
            <div className="info-card">
              <p>Save this playlist to your Spotify account to listen anytime:</p>
              <ul className="benefits-list">
                <li>🎵 Access across all your devices</li>
                <li>📱 Listen offline with Spotify Premium</li>
                <li>🔄 Sync with your existing playlists</li>
                <li>🌟 Add to your Spotify library</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistView;