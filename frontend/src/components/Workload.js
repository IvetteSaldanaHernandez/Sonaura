import React, { useState } from 'react';
import './Workload.css';

const Workload = () => {
  const [selectedWorkload, setSelectedWorkload] = useState(null);

  const workloads = [
    { name: 'light', color: '#bbd6a9' },
    { name: 'moderate', color: '#f2cb9f' },
    { name: 'heavy', color: '#df9b9b' }
  ];

  const dummyPlaylists = {
    light: [
      { title: 'Easy Listening', artist: 'Chill Lounge' },
      { title: 'Mellow Moments', artist: 'Study Beats' },
      { title: 'Sweet Serenades', artist: 'Epic Instrumentals' },
      { title: 'Zen in the Garden', artist: 'Ambient Sounds' }
    ],
    heavy: [
      { title: 'Deep Focus', artist: 'Chill Lounge' },
      { title: 'Instrumental Study', artist: 'Study Beats' },
      { title: 'Heavy Duty Tracks', artist: 'Epic Instrumentals' },
      { title: 'Tunnel Vision', artist: 'Ambient Sounds' }
    ]
  };

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
        // <section className="playlist-section">
        //   <h2>Playlists based on your workload</h2>
        //   <div className="playlist-cards">
        //     <div className="playlist-card">
        //       <div className="card-image"></div>
        //       <div className="card-content">
        //         <h3>Playlist Title 1</h3>
        //         <p>Artist Placeholder</p>
        //       </div>
        //     </div>
        //     <div className="playlist-card">
        //       <div className="card-image"></div>
        //       <div className="card-content">
        //         <h3>Playlist Title 2</h3>
        //         <p>Artist Placeholder</p>
        //       </div>
        //     </div>
        //     <div className="playlist-card">
        //       <div className="card-image"></div>
        //       <div className="card-content">
        //         <h3>Playlist Title 3</h3>
        //         <p>Artist Placeholder</p>
        //       </div>
        //     </div>
        //     <div className="playlist-card">
        //       <div className="card-image"></div>
        //       <div className="card-content">
        //         <h3>Playlist Title 4</h3>
        //         <p>Artist Placeholder</p>
        //       </div>
        //     </div>
        //   </div>
        // </section>
        <section className="playlist-section">
          <h2>Playlists based on your workload</h2>
          <div className="playlist-cards">
            {dummyPlaylists[selectedWorkload].map((playlist, index) => (
              <div key={index} className="playlist-card">
                <div className="card-image" style={{ backgroundColor: getWorkloadColor(selectedWorkload) }}></div>
                <div className="card-content">
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