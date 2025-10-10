import React, { useState } from 'react';
import './FocusLevel.css';

const FocusLevel = () => {
  const [hours, setHours] = useState('');
  const [focusLevel, setFocusLevel] = useState(null);

  const handleHoursChange = (event) => {
    const value = event.target.value;
    setHours(value === '6' ? '6+' : value);
  };

  const handleFocusClick = (level) => {
    setFocusLevel(level);
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
            {['Low', 'Medium', 'High'].map((level, index) => (
              <button
                key={index}
                className="focus-button"
                style={{ backgroundColor: level === 'Low' ? '#bbd6a9' : level === 'Medium' ? '#f2cb9f' : '#df9b9b' }}
                onClick={() => handleFocusClick(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </section>
      {(hours && focusLevel) && (
        <section className="playlist-section">
          <h2>Playlists based on your focus level</h2>
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

export default FocusLevel;