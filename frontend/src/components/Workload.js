import React, { useState } from 'react';
import './Workload.css';

const Workload = () => {
  const [selectedWorkload, setSelectedWorkload] = useState(null);

  const workloads = [
    { name: 'light', color: '#bbd6a9' },
    { name: 'moderate', color: '#f2cb9f' },
    { name: 'heavy', color: '#df9b9b' }
  ];

  const handleWorkloadClick = (workload) => {
    setSelectedWorkload(workload);
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
          <div className="playlist-cards">
            <div className="playlist-card">
              <div className="card-image"></div>
              <div className="card-content">
                <h3>Playlist Title 1</h3>
                <p>Artist Placeholder</p>
              </div>
            </div>
            <div className="playlist-card">
              <div className="card-image"></div>
              <div className="card-content">
                <h3>Playlist Title 2</h3>
                <p>Artist Placeholder</p>
              </div>
            </div>
            <div className="playlist-card">
              <div className="card-image"></div>
              <div className="card-content">
                <h3>Playlist Title 3</h3>
                <p>Artist Placeholder</p>
              </div>
            </div>
            <div className="playlist-card">
              <div className="card-image"></div>
              <div className="card-content">
                <h3>Playlist Title 4</h3>
                <p>Artist Placeholder</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Workload;