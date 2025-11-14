import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Workload.css';

const Workload = () => {
  const [selectedWorkload, setSelectedWorkload] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const workloads = [
    { name: 'light', color: '#bbd6a9' },
    { name: 'moderate', color: '#f2cb9f' },
    { name: 'heavy', color: '#df9b9b' }
  ];

  useEffect(() => {
    if (!selectedWorkload) return;
    const token = localStorage.getItem('jwt_token');
    if (!token) { navigate('/login'); return; }

    axios.post(
      'http://localhost:5000/api/spotify/workload-playlists',
      { workload: selectedWorkload },
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
  }, [selectedWorkload, navigate]);

  const handleWorkloadClick = (workload) => {
    setSelectedWorkload(workload);
  };

  const getWorkloadColor = (workloadName) => {
    const workload = workloads.find(w => w.name === workloadName);
    return workload ? workload.color : '#ccc'; // Default to white if mood not found
  };

  return (
    <div className="workload">
      <section className="workload-selection">
        <h2>How heavy is your workload today?</h2>
        <div className="workload-buttons">
          {workloads.map((workload, index) => (
            <button
              key={index}
              className="workload-button"
              style={{ backgroundColor: workload.color }}
              onClick={() => handleWorkloadClick(workload.name)}
            >
              {workload.name.charAt(0).toUpperCase() + workload.name.slice(1)}
            </button>
          ))}
        </div>
      </section>
      {selectedWorkload && (
        <section className="playlist-section">
          <h2>Playlists based on your workload</h2>
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
              <div key={index} className="playlist-card">
                <div className="card-image" style={{ backgroundImage: `url(${playlist.image})` }}></div>
                <div className="card-content" style={{ backgroundColor: getWorkloadColor(selectedWorkload) }}>
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

export default Workload;