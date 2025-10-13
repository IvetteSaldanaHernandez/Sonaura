import React, { useState } from 'react';
// import { NavLink } from 'react-router-dom';
import './Mood.css';

const Mood = () => {
  const [selectedMood, setSelectedMood] = useState(null);

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

  const handleMoodClick = (mood) => {
    setSelectedMood(mood); // set mood
  };

  return (
    <div className="mood">
      <section className="mood-selection">
        <h2>What are you feeling today?</h2>
        <div className="mood-buttons">
          {moods.map((mood, index) => (
            <button
              key={index}
              // to={`/mood/${mood.name}`} // Placeholder route
              // className="mood-button"
              // style={{ backgroundColor: mood.color }}
              className="mood-button"
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
          <h2>Playlists based on your mood</h2>
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

export default Mood;