import React from 'react';
import './Activity.css';

const Activity = () => {
  const dummyPlaylists = {
    recentlyPlayed: [
      { title: 'Last Night’s Study', artist: 'Chillhop Music' },
      { title: 'Morning Focus', artist: 'Lo-Fi Hip Hop' },
      { title: 'Evening Wind Down', artist: 'Relaxing Piano' },
      { title: 'Quick Break', artist: 'Jazz Vibes' }
    ],
    albumsLiked: [
      { title: 'Classical Favorites', artist: 'Orchestral Hits' },
      { title: 'Pop Study Mix', artist: 'Top 40 Essentials' },
      { title: 'Electronic Chill', artist: 'Synth Waves' },
      { title: 'Acoustic Moods', artist: 'Folk Tunes' }
    ],
    newRecommendations: [
      { title: 'New Lo-Fi Drop', artist: 'Beat Makers' },
      { title: 'Fresh Classical', artist: 'Symphony Newbies' },
      { title: 'Upbeat Study', artist: 'Pop Newcomers' },
      { title: 'Ambient Discovery', artist: 'Soundscapes' }
    ]
  };

  return (
    <div className="activity">
      <section className="activity-section">
        <h2>Playlists based on your recently played</h2>
        <div className="playlist-cards">
          {dummyPlaylists.recentlyPlayed.map((playlist, index) => (
            <div key={index} className="playlist-card">
              <div className="card-image"></div>
              <div className="card-content">
                <h3>{playlist.title}</h3>
                <p>{playlist.artist}</p>
              </div>
            </div>
          ))}
        </div>
        {/* <div className="playlist-cards">
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
        </div> */}
      </section>
      <section className="activity-section">
        <h2>Playlists featuring songs you like</h2>
        <div className="playlist-cards">
          {dummyPlaylists.albumsLiked.map((playlist, index) => (
            <div key={index} className="playlist-card">
              <div className="card-image"></div>
              <div className="card-content">
                <h3>{playlist.title}</h3>
                <p>{playlist.artist}</p>
              </div>
            </div>
          ))}
        </div>
        {/* <div className="playlist-cards">
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
        </div> */}
      </section>
      <section className="activity-section">
        <h2>New songs we think you might like</h2>
        <div className="playlist-cards">
          {dummyPlaylists.newRecommendations.map((playlist, index) => (
            <div key={index} className="playlist-card">
              <div className="card-image"></div>
              <div className="card-content">
                <h3>{playlist.title}</h3>
                <p>{playlist.artist}</p>
              </div>
            </div>
          ))}
        </div>
        {/* <div className="playlist-cards">
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
        </div> */}
      </section>
    </div>
  );
};

export default Activity;