import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Activity.css';

const Activity = () => {
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [recRes, albRes, recmRes] = await Promise.all([
          axios.get('http://localhost:5000/api/spotify/recently-played', { headers }),
          axios.get('http://localhost:5000/api/spotify/liked-albums',   { headers }),
          axios.get('http://localhost:5000/api/spotify/recommendations', { headers })
        ]);

        setRecentlyPlayed(recRes.data);
        setLikedAlbums(albRes.data);
        setRecommendations(recmRes.data);
        setError('');
      } catch (err) {
        const msg = err.response?.data?.error || err.message || 'Failed to fetch data from Spotify.';
        setError(msg);
      }
    };

    fetchData();
  }, [navigate]);

  return (
    <div className="activity">
      {error && (
        <p className="error">
          {error}{' '}
          {error.includes('Spotify not connected') && (
            <button onClick={() => navigate('/profile')}>Go to Profile</button>
          )}
        </p>
      )}
      <section className="activity-section">
        <h2>Playlists based on your recently played</h2>
        <div className="playlist-cards">
          {recentlyPlayed.map((playlist, index) => (
            <div key={index} className="playlist-card">
              <div className="card-image" style={{ backgroundImage: `url(${playlist.image})` }}></div>
              <div className="card-content">
                <h3>{playlist.title}</h3>
                <p>{playlist.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="activity-section">
        <h2>Playlists featuring songs you like</h2>
        <div className="playlist-cards">
          {likedAlbums.map((album, index) => (
            <div key={index} className="playlist-card">
              <div className="card-image" style={{ backgroundImage: `url(${album.image})` }}></div>
              <div className="card-content">
                <h3>{album.title}</h3>
                <p>{album.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="activity-section">
        <h2>New songs we think you might like</h2>
        <div className="playlist-cards">
          {recommendations.map((track, index) => (
            <div key={index} className="playlist-card">
              <div className="card-image" style={{ backgroundImage: `url(${track.image})` }}></div>
              <div className="card-content">
                <h3>{track.title}</h3>
                <p>{track.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Activity;