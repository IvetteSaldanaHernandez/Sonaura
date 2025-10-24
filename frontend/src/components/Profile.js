import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      axios.get('http://localhost:5000/api/user/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setUser(res.data);
          if (localStorage.getItem('spotify_connect_success') === 'true') {
            setSuccessMessage('Spotify connected successfully! Visit the Home page for info on how to use the app.');
            localStorage.removeItem('spotify_connect_success');
          }
        })
        .catch(err => setError('Failed to fetch user data'));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleSpotifyConnect = () => {
    fetch('http://localhost:5000/api/spotify/login')
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('pending_spotify_connect', 'true');
        window.location.href = data.url;
      })
      .catch(err => setError('Failed to initiate Spotify connect'));
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="profile">
      <div className="profile-details">
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Spotify Connected:</strong> {user.spotifyId ? 'Yes' : 'No'}</p>
      </div>
      {/* {!user.spotifyId && (
        <button onClick={handleSpotifyConnect} className="spotify-connect">
          Connect to Spotify
        </button>
      )}
      {error && <p className="error">{error}</p>} */}
      {successMessage && (
        <p className="success">
          {successMessage}{' '}
          <button onClick={() => navigate('/')}>Go to Home</button>
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {!user.spotifyId && (
        <button onClick={handleSpotifyConnect} className="spotify-connect">
          Connect to Spotify
        </button>
      )}
    </div>
  );
};

export default Profile;