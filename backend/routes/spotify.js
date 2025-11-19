const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Mock data fallback
const mockPlaylists = [
  {
    id: 'mock-1',
    title: "Deep Focus Study",
    artist: "Study Beats",
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300",
    description: "Concentration enhancing tracks"
  },
  {
    id: 'mock-2',
    title: "Lo-Fi Study Session",
    artist: "Chillhop Music",
    image: "https://images.unsplash.com/photo-1571974599782-87624638275f?w=300",
    description: "Relaxing lo-fi beats for studying"
  },
  {
    id: 'mock-3',
    title: "Productivity Boost",
    artist: "Focus Flow",
    image: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=300",
    description: "Energetic focus music"
  },
  {
    id: 'mock-4',
    title: "Study Concentration",
    artist: "Brain Waves",
    image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=300",
    description: "Perfect for deep work sessions"
  }
];

// Helper function to format playlist data
function formatPlaylist(playlist, tracks = []) {
  if (!playlist) return null;
  
  return {
    id: playlist.id,
    title: playlist.name || 'Unknown Playlist',
    artist: playlist.owner?.display_name || 'Spotify',
    image: playlist.images?.[0]?.url || null,
    description: playlist.description || '',
    uri: playlist.uri || '',
    external_url: playlist.external_urls?.spotify || '',
    tracks: tracks
  };
}

// Helper function to format track data
function formatTrack(track) {
  if (!track) return null;
  
  return {
    id: track.id,
    title: track.name,
    artist: track.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist',
    image: track.album?.images?.[0]?.url || null,
    duration: track.duration_ms,
    duration_formatted: formatDuration(track.duration_ms),
    uri: track.uri,
    external_url: track.external_urls?.spotify,
    preview_url: track.preview_url
  };
}

// Format duration from ms to MM:SS
function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Get Spotify auth URL
router.get('/auth-url', (req, res) => {
  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent('user-read-private user-read-email user-read-recently-played user-library-read playlist-read-private playlist-read-collaborative user-top-read playlist-modify-public playlist-modify-private')}` +
    `&show_dialog=true`;
  
  res.json({ authUrl });
});

// Initial login with Spotify
router.get('/login', (req, res) => {
  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent('user-read-private user-read-email user-read-recently-played user-library-read playlist-read-private playlist-read-collaborative user-top-read playlist-modify-public playlist-modify-private')}`;
  
  res.json({ url: authUrl });
});

// Spotify callback - initial login
router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user info from Spotify
    const userResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    // Create or update user in database
    const spotifyUsername = userResponse.data.id;
    let user = await User.findOne({ username: spotifyUsername });

    if (!user) {
      user = new User({
        username: spotifyUsername,
        password: await require('bcryptjs').hash(spotifyUsername + Date.now(), 10),
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
        hasSpotify: true
      });
    } else {
      user.spotifyAccessToken = access_token;
      user.spotifyRefreshToken = refresh_token;
      user.hasSpotify = true;
    }

    await user.save();

    // Create JWT token
    const token = require('jsonwebtoken').sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      access_token,
      refresh_token,
      token
    });
  } catch (error) {
    console.error('Spotify callback error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Spotify' });
  }
});

// Connect Spotify to existing account
router.post('/connect', auth, async (req, res) => {
  try {
    const { code } = req.body;

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Update user with Spotify tokens
    req.user.spotifyAccessToken = access_token;
    req.user.spotifyRefreshToken = refresh_token;
    req.user.hasSpotify = true;
    await req.user.save();

    res.json({
      access_token,
      refresh_token,
      message: 'Spotify connected successfully'
    });
  } catch (error) {
    console.error('Spotify connect error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to connect Spotify' });
  }
});

// Get valid Spotify token (keep your existing implementation)
async function getValidSpotifyToken(user) {
  try {
    await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${user.spotifyAccessToken}`
      }
    });
    return user.spotifyAccessToken;
  } catch (error) {
    if (error.response?.status === 401) {
      return await refreshSpotifyToken(user);
    }
    throw error;
  }
}

// Refresh Spotify token (keep your existing implementation)
async function refreshSpotifyToken(user) {
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.spotifyRefreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    user.spotifyAccessToken = response.data.access_token;
    if (response.data.refresh_token) {
      user.spotifyRefreshToken = response.data.refresh_token;
    }
    await user.save();
    
    return response.data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    throw new Error('Failed to refresh Spotify token');
  }
}

// Get user's recently played playlists
async function getUserRecentlyPlayedPlaylists(token, limit = 4) {
  try {
    const recentlyPlayedResponse = await axios.get(
      `https://api.spotify.com/v1/me/player/recently-played?limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Extract unique playlist IDs from recently played tracks
    const playlistIds = [...new Set(
      recentlyPlayedResponse.data.items
        .map(item => item.context?.uri)
        .filter(uri => uri && uri.startsWith('spotify:playlist:'))
        .map(uri => uri.split(':')[2])
    )].slice(0, limit);

    // Fetch details for each playlist
    const playlists = await Promise.all(
      playlistIds.map(async (playlistId) => {
        try {
          const playlistResponse = await axios.get(
            `https://api.spotify.com/v1/playlists/${playlistId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          // Get a few tracks from the playlist
          const tracksResponse = await axios.get(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=4`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          const tracks = tracksResponse.data.items
            .slice(0, 4)
            .map(item => formatTrack(item.track))
            .filter(track => track !== null);

          return formatPlaylist(playlistResponse.data, tracks);
        } catch (error) {
          console.error(`Error fetching playlist ${playlistId}:`, error.message);
          return null;
        }
      })
    );

    return playlists.filter(playlist => playlist !== null);
  } catch (error) {
    console.error('Error fetching recently played playlists:', error.message);
    throw error;
  }
}
// async function getUserRecentlyPlayedPlaylists(token, limit = 5) {
//   try {
//     // First get recently played tracks
//     const recentlyPlayedResponse = await axios.get(
//       `https://api.spotify.com/v1/me/player/recently-played?limit=10`,
//       {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       }
//     );

//     // Extract unique playlist IDs from recently played tracks
//     const playlistIds = [...new Set(
//       recentlyPlayedResponse.data.items
//         .map(item => item.context?.uri)
//         .filter(uri => uri && uri.startsWith('spotify:playlist:'))
//         .map(uri => uri.split(':')[2])
//     )].slice(0, limit);

//     // Fetch details for each playlist
//     const playlists = await Promise.all(
//       playlistIds.map(async (playlistId) => {
//         try {
//           const playlistResponse = await axios.get(
//             `https://api.spotify.com/v1/playlists/${playlistId}`,
//             {
//               headers: {
//                 'Authorization': `Bearer ${token}`
//               }
//             }
//           );
//           return formatPlaylist(playlistResponse.data);
//         } catch (error) {
//           console.error(`Error fetching playlist ${playlistId}:`, error.message);
//           return null;
//         }
//       })
//     );

//     return playlists.filter(playlist => playlist !== null);
//   } catch (error) {
//     console.error('Error fetching recently played playlists:', error.message);
//     throw error;
//   }
// }

// Get user's saved albums and create playlists from them
async function getUserLikedAlbumsPlaylists(token, limit = 4) {
  try {
    const savedAlbumsResponse = await axios.get(
      `https://api.spotify.com/v1/me/albums?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const albumPlaylists = await Promise.all(
      savedAlbumsResponse.data.items.map(async (item, index) => {
        try {
          const album = item.album;
          
          // Get tracks for this album
          const tracksResponse = await axios.get(
            `https://api.spotify.com/v1/albums/${album.id}/tracks`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          const tracks = tracksResponse.data.items
            .slice(0, 4) // Show first 4 tracks
            .map(track => ({
              id: track.id,
              name: track.name,
              artist: track.artists.map(artist => artist.name).join(', '),
              duration: formatDuration(track.duration_ms)
            }));

          return {
            id: `album-${album.id}`,
            title: album.name,
            artist: album.artists.map(artist => artist.name).join(', '),
            image: album.images?.[0]?.url || null,
            description: `Album • ${album.release_date?.split('-')[0] || ''}`,
            tracks: tracks
          };
        } catch (error) {
          console.error(`Error processing album ${index}:`, error.message);
          return null;
        }
      })
    );

    return albumPlaylists.filter(playlist => playlist !== null);
  } catch (error) {
    console.error('Error fetching liked albums:', error.message);
    throw error;
  }
}

// Get user's top artists for seed recommendations
async function getUserTopArtists(token, limit = 2) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/me/top/artists?limit=${limit}&time_range=short_term`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const artistIds = response.data.items.map(artist => artist.id);
    console.log('Top artists found:', artistIds);
    
    // Validate the artist IDs
    await validateSpotifyIds(token, artistIds, 'artist');
    
    return artistIds;
  } catch (error) {
    console.log('Failed to get top artists, using fallback');
    return [];
  }
}

// Get user's top tracks for seed recommendations
async function getUserTopTracks(token, limit = 2) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=short_term`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const trackIds = response.data.items.map(track => track.id);
    console.log('Top tracks found:', trackIds);
    
    // Validate the track IDs
    await validateSpotifyIds(token, trackIds, 'track');
    
    return trackIds;
  } catch (error) {
    console.log('Failed to get top tracks, using fallback');
    return [];
  }
}

// Get personalized recommendations based on user's top artists/tracks
async function getPersonalizedRecommendations(token, limit = 4) {
  try {
    // Get user's top artists for seeds
    let seedArtists = [];
    try {
      const topArtistsResponse = await axios.get(
        `https://api.spotify.com/v1/me/top/artists?limit=2&time_range=short_term`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      seedArtists = topArtistsResponse.data.items.map(artist => artist.id).slice(0, 2);
    } catch (error) {
      console.log('Could not get top artists, using fallback seeds');
      seedArtists = ['4gzpq5DPGxSnKTe4SA8HAU', '1uNFoZAHBGtllmzznpCI3s']; // Coldplay, Ed Sheeran as fallback
    }

    // Get recommendations based on user's top artists
    const params = new URLSearchParams({
      limit: '12',
      market: 'US'
    });

    // Add seed artists if available
    if (seedArtists.length > 0) {
      seedArtists.forEach(artistId => {
        params.append('seed_artists', artistId);
      });
    }

    // Add some genres as fallback
    if (seedArtists.length === 0) {
      params.append('seed_genres', 'study,chill');
    }

    const recommendationsResponse = await axios.get(
      `https://api.spotify.com/v1/recommendations?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Create a playlist from recommendations
    const tracks = recommendationsResponse.data.tracks.slice(0, 4).map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      duration: track.duration_ms,
      duration_formatted: formatDuration(track.duration_ms),
      uri: track.uri
    }));

    return [{
      id: 'personalized-recommendations',
      title: 'Made For You',
      artist: 'StudySound',
      image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300',
      description: 'Personalized recommendations based on your taste',
      tracks: tracks
    }];
  } catch (error) {
    console.error('Error fetching personalized recommendations:', error.message);
    throw error;
  }
}
// async function getPersonalizedRecommendations(token, limit = 5) {
//   try {
//     // Get user's top artists for seeds
//     const topArtistsResponse = await axios.get(
//       `https://api.spotify.com/v1/me/top/artists?limit=2&time_range=short_term`,
//       {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       }
//     );

//     const seedArtists = topArtistsResponse.data.items.map(artist => artist.id).slice(0, 2);

//     // Get recommendations based on user's top artists
//     const params = new URLSearchParams({
//       limit: '12',
//       seed_artists: seedArtists.join(','),
//       market: 'US'
//     });

//     const recommendationsResponse = await axios.get(
//       `https://api.spotify.com/v1/recommendations?${params}`,
//       {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       }
//     );

//     // Create a playlist from recommendations
//     const tracks = recommendationsResponse.data.tracks.slice(0, 4).map(track => ({
//       name: track.name,
//       artist: track.artists.map(artist => artist.name).join(', '),
//       duration: formatDuration(track.duration_ms)
//     }));

//     return [{
//       id: 'personalized-recommendations',
//       title: 'Made For You',
//       artist: 'StudySound',
//       image: topArtistsResponse.data.items[0]?.images?.[0]?.url || null,
//       description: 'Personalized recommendations based on your taste',
//       tracks: tracks
//     }];
//   } catch (error) {
//     console.error('Error fetching personalized recommendations:', error.message);
//     throw error;
//   }
// }

// Get mood-based recommendations
async function getMoodRecommendations(token, mood, limit = 4) {
  try {
    const moodGenres = {
      love: ['indie-pop', 'r-n-b', 'acoustic'],
      rage: ['rock', 'metal', 'hardcore'],
      optimism: ['pop', 'happy', 'indie-pop'],
      joy: ['pop', 'dance', 'electronic'],
      nostalgia: ['classic-rock', '90s', '80s'],
      confident: ['hip-hop', 'rap', 'trap'],
      'hyper craze': ['electronic', 'dance', 'edm'],
      sad: ['sad', 'acoustic', 'piano']
    };

    const genres = moodGenres[mood] || ['study', 'ambient'];
    
    const params = new URLSearchParams({
      limit: '12',
      seed_genres: genres.slice(0, 2).join(','),
      market: 'US'
    });

    const recommendationsResponse = await axios.get(
      `https://api.spotify.com/v1/recommendations?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const tracks = recommendationsResponse.data.tracks.slice(0, 4).map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      duration: formatDuration(track.duration_ms),
      uri: track.uri
    }));

    return [{
      id: `mood-${mood}`,
      title: `${mood.charAt(0).toUpperCase() + mood.slice(1)} Mood`,
      artist: 'StudySound',
      image: null,
      description: `Curated for your ${mood} mood`,
      tracks: tracks
    }];
  } catch (error) {
    console.error('Error fetching mood recommendations:', error.message);
    throw error;
  }
}

// Get workload-based recommendations
async function getWorkloadRecommendations(token, workload, limit = 4) {
  try {
    const workloadConfig = {
      light: {
        target_energy: 0.7,
        target_valence: 0.8,
        seed_genres: ['pop', 'indie-pop', 'acoustic']
      },
      moderate: {
        target_energy: 0.5,
        target_valence: 0.6,
        seed_genres: ['chill', 'indie', 'alternative']
      },
      heavy: {
        target_energy: 0.3,
        target_valence: 0.4,
        seed_genres: ['ambient', 'classical', 'study']
      }
    };

    const config = workloadConfig[workload] || workloadConfig.moderate;
    
    const params = new URLSearchParams({
      limit: '12',
    //   seed_genres: config.seed_genres.slice(0, 2).join(','),
      target_energy: config.target_energy,
      target_valence: config.target_valence,
      market: 'US'
    });

    config.seed_genres.slice(0, 2).forEach(genre => {
      params.append('seed_genres', genre);
    });

    // const recommendationsResponse = await axios.get(
    //   `https://api.spotify.com/v1/recommendations?${params}`,
    //   {
    //     headers: {
    //       'Authorization': `Bearer ${token}`
    //     }
    //   }
    // );

    const tracks = recommendationsResponse.data.tracks.slice(0, 4).map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      duration: formatDuration(track.duration_ms),
      uri: track.uri
    }));

    return [{
      id: `workload-${workload}`,
      title: `${workload.charAt(0).toUpperCase() + workload.slice(1)} Workload`,
      artist: 'StudySound',
      image: null,
      description: `Optimized for ${workload} workload`,
      tracks: tracks
    }];
  } catch (error) {
    console.error('Error fetching workload recommendations:', error.message);
    throw error;
  }
}

// Get focus level-based recommendations
async function getFocusRecommendations(token, focusLevel, studyHours, limit = 4) {
  try {
    const focusConfig = {
      low: {
        target_energy: 0.7,
        target_valence: 0.7,
        seed_genres: ['pop', 'indie-pop', 'electronic']
      },
      medium: {
        target_energy: 0.5,
        target_valence: 0.6,
        seed_genres: ['chill', 'indie', 'alternative']
      },
      high: {
        target_energy: 0.3,
        target_valence: 0.4,
        seed_genres: ['ambient', 'classical', 'jazz']
      }
    };

    const config = focusConfig[focusLevel] || focusConfig.medium;
    // const limit = studyHours === '6+' ? 20 : parseInt(studyHours) * 3 + 5;
    const limit = studyHours === '6+' ? 20 : (parseInt(studyHours) || 3) * 3 + 5;
    
    const params = new URLSearchParams({
      limit: limit.toString(),
    //   seed_genres: config.seed_genres.slice(0, 2).join(','),
      target_energy: config.target_energy,
      target_valence: config.target_valence,
      market: 'US'
    });

    config.seed_genres.slice(0, 2).forEach(genre => {
      params.append('seed_genres', genre);
    });

    const recommendationsResponse = await axios.get(
      `https://api.spotify.com/v1/recommendations?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const tracks = recommendationsResponse.data.tracks.slice(0, 4).map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      duration: formatDuration(track.duration_ms),
      uri: track.uri
    }));

    return [{
      id: `focus-${focusLevel}-${studyHours}h`,
      title: `${focusLevel.charAt(0).toUpperCase() + focusLevel.slice(1)} Focus (${studyHours}h)`,
      artist: 'StudySound',
      image: null,
      description: `Perfect for ${studyHours} hours of ${focusLevel} focus`,
      tracks: tracks
    }];
  } catch (error) {
    console.error('Error fetching focus recommendations:', error.message);
    throw error;
  }
}

// FIXED ENDPOINTS:

// Recently played - returns user's actual recently played playlists
router.get('/recently-played', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    const playlists = await getUserRecentlyPlayedPlaylists(token);
    res.json(playlists);
    
  } catch (error) {
    console.error('Recently played error:', error.message);
    res.json(mockPlaylists);
  }
});

// Liked albums - returns playlists created from user's saved albums
router.get('/liked-albums', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    const playlists = await getUserLikedAlbumsPlaylists(token);
    res.json(playlists);
    
  } catch (error) {
    console.error('Liked albums error:', error.message);
    res.json(mockPlaylists);
  }
});

// Recommendations - returns personalized recommendations based on user's taste
router.get('/recommendations', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    const playlists = await getPersonalizedRecommendations(token);
    res.json(playlists);
    
  } catch (error) {
    console.error('Recommendations error:', error.message);
    res.json(mockPlaylists);
  }
});

// Mood playlists - returns mood-based recommendations
router.post('/mood-playlists', auth, async (req, res) => {
  try {
    const { mood } = req.body;
    
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    const playlists = await getMoodRecommendations(token, mood);
    res.json(playlists);
    
  } catch (error) {
    console.error('Mood playlists error:', error.message);
    const moodPlaylist = {
      ...mockPlaylists[0],
      id: `mood-${mood}`,
    //   title: `${mood.charAt(0).toUpperCase() + mood.slice(1)} Mood Study`,
      title: `${mood.charAt(0)?.toUpperCase() + mood.slice(1) || 'Mood'} Study`,
      description: `Curated for your ${mood} mood`
    };
    res.json([moodPlaylist]);
  }
});

// Workload playlists - returns workload-based recommendations
router.post('/workload-playlists', auth, async (req, res) => {
  try {
    const { workload } = req.body;
    
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    const playlists = await getWorkloadRecommendations(token, workload);
    res.json(playlists);
    
  } catch (error) {
    console.error('Workload playlists error:', error.message);
    const workloadPlaylist = {
      ...mockPlaylists[0],
      title: `${workload.charAt(0).toUpperCase() + workload.slice(1)} Workload Focus`,
      description: `Optimized for ${workload} workload`
    };
    res.json([workloadPlaylist]);
  }
});

// Focus level playlists - returns focus-based recommendations
router.post('/focus-playlists', auth, async (req, res) => {
  try {
    const { focusLevel, studyHours } = req.body;
    
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    const playlists = await getFocusRecommendations(token, focusLevel, studyHours);
    res.json(playlists);
    
  } catch (error) {
    console.error('Focus playlists error:', error.message);
    const focusPlaylist = {
      ...mockPlaylists[0],
      title: `${focusLevel.charAt(0).toUpperCase() + focusLevel.slice(1)} Focus (${studyHours}h)`,
      description: `Perfect for ${studyHours} hours of ${focusLevel} focus`
    };
    res.json([focusPlaylist]);
  }
});

// Get playlist tracks
router.get('/playlist/:id/tracks', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    const tracksResponse = await axios.get(
      `https://api.spotify.com/v1/playlists/${id}/tracks`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const tracks = tracksResponse.data.items
      .map(item => formatTrack(item.track))
      .filter(track => track !== null);

    res.json(tracks);
    
  } catch (error) {
    console.error('Playlist tracks error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch playlist tracks' });
  }
});
// Keep your existing auth endpoints and other utility functions...

module.exports = router;