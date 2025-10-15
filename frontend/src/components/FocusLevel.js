import React, { useState } from 'react';
import './FocusLevel.css';

const FocusLevel = () => {
  const [hours, setHours] = useState('');
  const [selectedFocusLevel, setSelectedFocusLevel] = useState(null);

  const focusLevels = [
    { name: 'low', color: '#bbd6a9' },
    { name: 'medium', color: '#f2cb9f' },
    { name: 'high', color: '#df9b9b' }
  ];

  const handleHoursChange = (event) => {
    const value = event.target.value;
    setHours(value === '6' ? '6+' : value);
  };

  const handleFocusClick = (focusLevel) => {
    setSelectedFocusLevel(focusLevel);
  };

  const dummyPlaylists = {
    medium: [
      { title: 'Peaceful Productivity', artist: 'Lo-Fi Essentials' },
      { title: 'Medium Study Flow', artist: 'Classical Mix' },
      { title: 'Background Processing', artist: 'Electronic Beats' },
      { title: 'Extended Concentration', artist: 'Ambient Tracks' }
    ],
    high: [
      { title: 'Lofi for Deep Work', artist: 'Lo-Fi Essentials' },
      { title: 'Classical for Productivity', artist: 'Classical Mix' },
      { title: 'Creativity Boost', artist: 'Electronic Beats' },
      { title: 'Instrumental Study', artist: 'Ambient Tracks' }
    ]
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
                className="focus-button"
                style={{ backgroundColor: focusLevel.color }}
                onClick={() => handleFocusClick(focusLevel.name)}
              >
                {focusLevel.name.charAt(0).toUpperCase() + focusLevel.name.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>
      {(hours && selectedFocusLevel && dummyPlaylists[selectedFocusLevel]) && (
        // <section className="playlist-section">
        //   <h2>Playlists based on your focus level</h2>
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
          <h2>Playlists based on your focus level</h2>
          <div className="playlist-cards">
            {dummyPlaylists[selectedFocusLevel].map((playlist, index) => (
              <div key={index} className="playlist-card">
                <div className="card-image" style={{ backgroundColor: getFocusLevelColor(selectedFocusLevel) }}></div>
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

export default FocusLevel;