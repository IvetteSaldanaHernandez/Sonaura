import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './FocusLevel.css';

const FocusLevel = () => {
  const [hours, setHours] = useState('');
  const [selectedFocusLevel, setSelectedFocusLevel] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const focusLevels = [
    { name: 'low', color: '#bbd6a9' },
    { name: 'medium', color: '#f2cb9f' },
    { name: 'high', color: '#df9b9b' }
  ];

  useEffect(() => {
    if (!selectedFocusLevel || !hours) return;
    const token = localStorage.getItem('jwt_token');
    if (!token) { navigate('/login'); return; }

    axios.post(
      'http://localhost:5000/api/spotify/focus-playlists',
      { 
        focusLevel: selectedFocusLevel,
        studyHours: hours 
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(res => { 
        setPlaylists(res.data); 
        setError(''); 
      })
      .catch(err => {
        const msg = err.response?.data?.error || err.message || 'Failed to fetch playlists.';
        setError(msg);
      });
  }, [selectedFocusLevel, hours, navigate]);

  const handleHoursChange = (event) => {
    const value = event.target.value;
    setHours(value === '6' ? '6+' : value);
  };

  const handleFocusClick = (focusLevel) => {
    setSelectedFocusLevel(focusLevel);
  };

  const handlePlaylistClick = (playlist) => {
    navigate('/playlist-view', { 
      state: { 
        playlist,
        sectionType: 'focus',
        recommendationReason: `Perfect for ${hours} hours of ${selectedFocusLevel} focus`,
        moodColor: getFocusLevelColor(selectedFocusLevel)
      }
    });
  };

  const getFocusLevelColor = (focusLevelName) => {
    const focusLevel = focusLevels.find(f => f.name === focusLevelName);
    return focusLevel ? focusLevel.color : '#ccc'; // Default to white if mood not found
  };

  return (
    <div className="focus-level">
      <section className="focus-selection">
        <div className="hours-selection">
          <h2>How many hours do you plan to study?</h2>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="6"
              value={hours === '6+' ? 6 : hours}
              onChange={handleHoursChange}
              className="hours-slider"
            />
            <span className="slider-value">{hours} hours</span>
          </div>
        </div>
        <div className="focus-level-selection">
          <h2>How focused do you want to be?</h2>
          <div className="focus-buttons">
            {focusLevels.map((focusLevel, index) => (
              <button
                key={index}
                className={`focus-button ${selectedFocusLevel === focusLevel.name ? 'active' : ''}`}
                style={{ backgroundColor: focusLevel.color }}
                onClick={() => handleFocusClick(focusLevel.name)}
              >
                {focusLevel.name.charAt(0).toUpperCase() + focusLevel.name.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>
      {(hours && selectedFocusLevel && playlists.length > 0) && (
        <section className="playlist-section">
          <h2>Playlists for {hours} hours of {selectedFocusLevel} focus</h2>
          {error && (
            <p className="error">
              {error}{' '}
              {error.includes('Spotify not connected') && (
                <button onClick={() => navigate('/profile')}>Go to Profile</button>
              )}
            </p>
          )}
          <div className="playlist-cards">
            {playlists.map((playlist, index) => (
              <div 
                key={index} 
                className="playlist-card"
                onClick={() => handlePlaylistClick(playlist)}
              >
                <div className="card-image" style={{ backgroundImage: `url(${playlist.image})` }}>
                  {!playlist.image && <div className="image-placeholder">🎵</div>}
                </div>
                <div className="card-content" style={{ backgroundColor: getFocusLevelColor(selectedFocusLevel) + '40' }}>
                  <h3>{playlist.title}</h3>
                  <p>{playlist.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FocusLevel;