import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setUser(res.data.user);
          if (localStorage.getItem('spotify_connect_success') === 'true') {
            setSuccessMessage('Spotify connected successfully! Visit the Home page for info on how to use the app.');
            localStorage.removeItem('spotify_connect_success');
          }
        })
        .catch(err => {
          console.error('Profile fetch error:', err);
          setError('Failed to fetch user data');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleSpotifyConnect = () => {
    fetch('http://localhost:5000/api/spotify/auth-url')
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('pending_spotify_connect', 'true');
        window.location.href = data.authUrl;
      })
      .catch(err => {
        console.error('Spotify connect error:', err);
        setError('Failed to initiate Spotify connect');
      });
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="profile">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <h1>Your Profile</h1>
        <p className="profile-subtitle">Manage your account and preferences</p>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="card-header">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <h2>{user?.username}</h2>
              <div className={`connection-status ${user?.hasSpotify ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
                {user?.hasSpotify ? 'Spotify Connected' : 'Spotify Not Connected'}
              </div>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-item">
              <span className="detail-label">Username</span>
              <span className="detail-value">{user?.username}</span>
            </div>
            {/* <div className="detail-item">
              <span className="detail-label">Account Type</span>
              <span className="detail-value">Standard User</span>
            </div> */}
            <div className="detail-item">
              <span className="detail-label">Spotify Status</span>
              <span className={`detail-value ${user?.hasSpotify ? 'connected' : 'disconnected'}`}>
                {user?.hasSpotify ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>

          {successMessage && (
            <div className="success-message">
              <div className="success-icon">✅</div>
              <div className="success-content">
                <p>{successMessage}</p>
                <button onClick={handleGoHome} className="home-button">
                  Go to Home
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
            </div>
          )}

          {!user?.hasSpotify && (
            <div className="spotify-section">
              <div className="spotify-info">
                <h3>Connect Spotify</h3>
                <p>Connect your Spotify account to unlock personalized music recommendations and create playlists.</p>
                <ul className="benefits-list">
                  <li>🎵 Get personalized music recommendations</li>
                  <li>📱 Save playlists directly to your Spotify</li>
                  <li>🎧 Discover new music based on your taste</li>
                  {/* <li>🌟 Enhanced AI-powered suggestions</li> */}
                </ul>
              </div>
              <button onClick={handleSpotifyConnect} className="spotify-connect-btn">
                <span className="spotify-icon">🎵</span>
                Connect Spotify Account
              </button>
            </div>
          )}

          {user?.hasSpotify && (
            <div className="connected-features">
              <h3>🎉 Spotify Connected!</h3>
              <p>You now have access to all features:</p>
              <div className="features-grid">
                {/* <div className="feature">
                  <span className="feature-icon"></span>
                  <span>AI Playlist Generation</span>
                </div> */}
                <div className="feature">
                  <span className="feature-icon"></span>
                  <span>Personalized Recommendations</span>
                </div>
                <div className="feature">
                  <span className="feature-icon"></span>
                  <span>Sync with Spotify</span>
                </div>
                <div className="feature">
                  <span className="feature-icon"></span>
                  <span>Study-based Playlists</span>
                </div>
                <div className="feature">
                  <span className="feature-icon"></span>
                  <span>Mood-based Playlists</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;