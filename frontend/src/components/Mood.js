import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Mood.css';

const Mood = () => {
  const [selectedMood, setSelectedMood] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const moods = [
    { name: 'love', color: '#f7c6d3' },
    { name: 'rage', color: '#df9b9b' },
    { name: 'optimism', color: '#f2cb9f' },
    { name: 'joy', color: '#fae59d' },
    { name: 'nostalgia', color: '#bbd6a9' },
    { name: 'confident', color: '#a8c5f6' },
    { name: 'hyper craze', color: '#b3a8d5' },
    { name: 'sad', color: '#999999' }
  ];

  useEffect(() => {
    if (!selectedMood) return;
    const token = localStorage.getItem('jwt_token');
    if (!token) { navigate('/login'); return; }

    axios.post(
      'http://localhost:5000/api/spotify/mood-playlists',
      { mood: selectedMood },
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
  }, [selectedMood, navigate]);

  const handleMoodClick = (mood) => {
    setSelectedMood(mood);
  };

  const handlePlaylistClick = (playlist) => {
    navigate('/playlist-view', { 
      state: { 
        playlist,
        sectionType: 'mood',
        recommendationReason: `Curated for your ${selectedMood} mood`,
        moodColor: getMoodColor(selectedMood)
      }
    });
  };

  const getMoodColor = (moodName) => {
    const mood = moods.find(m => m.name === moodName);
    return mood ? mood.color : '#ccc';
  };

  return (
    <div className="mood">
      <section className="mood-selection">
        <h2>What are you feeling today?</h2>
        <div className="mood-buttons">
          {moods.map((mood, index) => (
            <button
              key={index}
              className={`mood-button ${selectedMood === mood.name ? 'active' : ''}`}
              style={{ backgroundColor: mood.color }}
              onClick={() => handleMoodClick(mood.name)}
            >
              {mood.name.charAt(0).toUpperCase() + mood.name.slice(1)}
            </button>
          ))}
        </div>
      </section>
      
      {selectedMood && (
        <section className="playlist-section">
          <h2>Playlists for your {selectedMood} mood</h2>
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
                <div className="card-content" style={{ backgroundColor: getMoodColor(selectedMood) + '40' }}>
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

export default Mood;