import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PlaylistView.css';

const PlaylistView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { playlist, sectionType, recommendationReason, moodColor } = location.state || {};
  const [tracks, setTracks] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  useEffect(() => {
    if (playlist?.id) {
      fetchPlaylistTracks();
    } else {
      setIsLoadingTracks(false);
    }
  }, [playlist]);

  const fetchPlaylistTracks = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    try {
      setIsLoadingTracks(true);
      const response = await axios.get(
        `http://localhost:5000/api/spotify/playlist/${playlist.id}/tracks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTracks(response.data);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
      // Use mock tracks if API fails
      setTracks(playlist.tracks || []);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handleSaveToSpotify = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setSaveStatus('Please connect your Spotify account first');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus('Saving to Spotify...');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/spotify/save-playlist',
        {
          playlistUrl: playlist.external_url,
          name: playlist.title,
          description: `${playlist.description} - ${recommendationReason}`,
          tracks: tracks
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.spotify_url) {
        // Open Spotify URL in new tab
        window.open(response.data.spotify_url, '_blank');
        setSaveStatus('✅ Opening Spotify...');
      } else {
        setSaveStatus('✅ Playlist saved!');
      }
      
      setTimeout(() => setSaveStatus(''), 3000);
      
    } catch (error) {
      console.error('Error saving playlist:', error);
      setSaveStatus('❌ Failed to save playlist');
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const openInSpotify = () => {
    if (playlist.external_url) {
      window.open(playlist.external_url, '_blank');
    }
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

  const displayTracks = tracks.length > 0 ? tracks : (playlist.tracks || []);

  return (
    <div className="playlist-view">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
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
              <strong>{displayTracks.length}</strong> songs
            </span>
            <span className="meta-item">
              <strong>{Math.round(displayTracks.reduce((acc, track) => acc + (track.duration || 180000), 0) / 60000)}</strong> min
            </span>
            {moodColor && (
              <span 
                className="mood-indicator"
                style={{ backgroundColor: moodColor }}
              >
                AI Generated
              </span>
            )}
          </div>
          <div className="recommendation-reason">
            <span className="reason-badge">{recommendationReason}</span>
          </div>
          
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
            
            {playlist.external_url && (
              <button 
                className="open-spotify-btn"
                onClick={openInSpotify}
              >
                <span className="spotify-icon">🔗</span>
                Open in Spotify
              </button>
            )}
            
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
          {isLoadingTracks ? (
            <div className="loading-tracks">Loading tracks...</div>
          ) : (
            <div className="tracks-list">
              {displayTracks.map((track, index) => (
                <div key={track.id || index} className="track-item">
                  <div className="track-number">{index + 1}</div>
                  <div className="track-info">
                    <div className="track-name">{track.title}</div>
                    <div className="track-artist">{track.artist}</div>
                  </div>
                  <div className="track-duration">
                    {track.duration_formatted || track.duration || '3:45'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="playlist-insights">
          <h2>Why this playlist?</h2>
          <div className="insight-card">
            <p>{recommendationReason}</p>
            <ul className="insight-list">
              <li>AI-generated based on your preferences</li>
              <li>Personalized using Spotify's recommendation engine</li>
              <li>Curated to match your current needs</li>
            </ul>
          </div>
          
          <div className="playlist-stats">
            <h3>Playlist Stats</h3>
            <div className="stats-grid">
              <div className="stat">
                <div className="stat-value">{displayTracks.length}</div>
                <div className="stat-label">Tracks</div>
              </div>
              <div className="stat">
                <div className="stat-value">
                  {Math.round(displayTracks.reduce((acc, track) => acc + (track.duration || 180000), 0) / 60000)}
                </div>
                <div className="stat-label">Minutes</div>
              </div>
              <div className="stat">
                <div className="stat-value">AI</div>
                <div className="stat-label">Generated</div>
              </div>
            </div>
          </div>

          <div className="spotify-info">
            <h3>Save to Your Library</h3>
            <div className="info-card">
              <p>This playlist has been created in your Spotify account. Save it to your library to listen anytime:</p>
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