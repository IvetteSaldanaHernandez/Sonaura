import React from 'react';
import './Profile.css';

const Profile = () => {
  const user = {
    username: 'User123' // Simulated user data; replace with actual data from auth
  };

  const handleSpotifyConnect = () => {
    // Placeholder for Spotify OAuth flow
    alert('Spotify connection feature coming soon!');
    // Implement Spotify API authentication here
  };

  return (
    <div className="profile">
      <div className="profile-details">
        <p><strong>Username:</strong> {user.username}</p>
      </div>
      <button onClick={handleSpotifyConnect} className="spotify-connect">
        Connect to Spotify
      </button>
    </div>
  );
};

export default Profile;