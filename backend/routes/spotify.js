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
    `&scope=${encodeURIComponent('user-read-private user-read-email user-read-recently-played user-library-read playlist-read-private playlist-read-collaborative user-top-read playlist-modify-public playlist-modify-private streaming user-read-playback-state user-modify-playback-state')}` +
    `&show_dialog=true`;
  
  res.json({ authUrl });
});

// Initial login with Spotify
router.get('/login', (req, res) => {
  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent('user-read-private user-read-email user-read-recently-played user-library-read playlist-read-private playlist-read-collaborative user-top-read playlist-modify-public playlist-modify-private streaming user-read-playback-state user-modify-playback-state')}`;
  
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

// Get valid Spotify token
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

// Refresh Spotify token
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
          
          // Get tracks from the playlist
          const tracksResponse = await axios.get(
            // `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=4`,
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          const tracks = tracksResponse.data.items
            // .slice(0, 4)
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
      savedAlbumsResponse.data.items.map(async (item) => {
        const album = item.album;
        
        try {
          // Get first batch of tracks for preview (6 tracks)
          const tracksResponse = await axios.get(
            `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=6`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          const tracks = tracksResponse.data.items
            .map(formatTrack)
            .filter(track => track !== null);

          return {
            id: `album-${album.id}`,
            title: album.name,
            artist: album.artists.map(a => a.name).join(', '),
            image: album.images?.[0]?.url || null,
            description: `Album • ${album.release_date?.split('-')[0] || 'Unknown Year'}`,
            tracks, // now properly formatted with title, image, preview_url, etc.
            type: 'album' // optional flag if your frontend uses it
          };
        } catch (err) {
          console.error(`Failed to load tracks for album ${album.id}`);
          return null;
        }
      })
    );

    return albumPlaylists.filter(Boolean);
  } catch (error) {
    console.error('Error fetching liked albums:', error.message);
    throw error;
  }
}

// Search fallback for playlists
async function getSearchFallbackPlaylists(token, query = 'study focus', limit = 4) {
  try {
    console.log('Searching for playlists with query:', query);
    
    // Search for real playlists
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}&market=US`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Search response received:', response.data);

    // Check if we have valid playlist data
    if (!response.data || !response.data.playlists || !response.data.playlists.items) {
      console.log('No valid playlist data in response');
      throw new Error('Invalid response structure from Spotify');
    }

    const playlistItems = response.data.playlists.items;
    console.log('Playlists found:', playlistItems.length);

    if (playlistItems.length === 0) {
      throw new Error('No playlists found in search results');
    }

    const playlists = await Promise.all(
      playlistItems.slice(0, limit).map(async (playlist, index) => {
        // Check if playlist is null or missing required fields
        if (!playlist || !playlist.id) {
          console.log(`Skipping invalid playlist at index ${index}:`, playlist);
          return null;
        }

        try {
          console.log(`Loading tracks for playlist: ${playlist.id} - ${playlist.name}`);
          
          // Get a few tracks for preview
          const tracksResponse = await axios.get(
            `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=6`,
            {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const tracks = tracksResponse.data.items
            .map(item => item && item.track ? formatTrack(item.track) : null)
            .filter(track => track !== null);

          return {
            id: playlist.id,
            title: playlist.name || 'Unknown Playlist',
            artist: playlist.owner?.display_name || 'Spotify',
            image: playlist.images?.[0]?.url || null,
            description: playlist.description || `Curated ${query} playlist`,
            uri: playlist.uri || '',
            external_url: playlist.external_urls?.spotify || '',
            tracks: tracks.slice(0, 6)
          };
        } catch (err) {
          console.error(`Failed to load tracks for playlist ${playlist.id}:`, err.message);
          // Return playlist without tracks if we can't load them
          return {
            id: playlist.id,
            title: playlist.name || 'Unknown Playlist',
            artist: playlist.owner?.display_name || 'Spotify',
            image: playlist.images?.[0]?.url || null,
            description: playlist.description || `Curated ${query} playlist`,
            uri: playlist.uri || '',
            external_url: playlist.external_urls?.spotify || '',
            tracks: []
          };
        }
      })
    );

    const validPlaylists = playlists.filter(playlist => playlist !== null);
    console.log(`Returning ${validPlaylists.length} valid playlists`);
    
    if (validPlaylists.length === 0) {
      throw new Error('No valid playlists could be created');
    }
    
    return validPlaylists;

  } catch (error) {
    console.error('Search fallback failed:', error.response?.data || error.message);
    
    // Ultimate fallback - use a simple track search and create virtual playlists
    return await getTrackSearchFallback(token, query, limit);
  }
}

// Also update the track search fallback to be more robust:
async function getTrackSearchFallback(token, query = 'study focus', limit = 4) {
  try {
    console.log('Using track search fallback for:', query);
    
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=30&market=US`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Check if we have valid track data
    if (!response.data || !response.data.tracks || !response.data.tracks.items) {
      throw new Error('Invalid track data from Spotify');
    }

    const tracks = response.data.tracks.items
      .map(track => track ? formatTrack(track) : null)
      .filter(track => track !== null);
    
    console.log('Tracks found:', tracks.length);
    
    if (tracks.length === 0) {
      throw new Error('No tracks found');
    }

    // Create virtual playlists from tracks
    const playlists = [];
    const tracksPerPlaylist = Math.min(6, Math.floor(tracks.length / limit));
    
    for (let i = 0; i < limit && i * tracksPerPlaylist < tracks.length; i++) {
      const startIdx = i * tracksPerPlaylist;
      const playlistTracks = tracks.slice(startIdx, startIdx + tracksPerPlaylist);
      
      if (playlistTracks.length > 0) {
        playlists.push({
          id: `search-${query.replace(/\s+/g, '-')}-${i}`,
          title: `${query.charAt(0).toUpperCase() + query.slice(1)} ${i + 1}`,
          artist: 'StudySound',
          image: playlistTracks[0]?.image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300',
          description: `Curated ${query} music`,
          tracks: playlistTracks,
          fullTracks: playlistTracks
        });
      }
    }

    console.log(`Created ${playlists.length} virtual playlists from track search`);
    
    if (playlists.length === 0) {
      throw new Error('Could not create any playlists from tracks');
    }
    
    return playlists;

  } catch (error) {
    console.error('Track search fallback also failed:', error.message);
    console.log('Using mock data as final fallback');
    return mockPlaylists.slice(0, limit);
  }
}

// Update the recommendation functions to handle errors better:
async function getPersonalizedRecommendations(token) {
  try {
    console.log('Attempting personalized recommendations...');
    
    // Simple test - just use genres with basic params
    const params = new URLSearchParams({
      limit: '20',
      seed_genres: 'study,ambient,chill',
      market: 'US'
    });

    const response = await axios.get(
      `https://api.spotify.com/v1/recommendations?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Recommendations API success, tracks:', response.data.tracks.length);

    const fullTracks = response.data.tracks.map(formatTrack).filter(Boolean);

    return [{
      id: 'personalized-recommendations',
      title: 'Made For You',
      artist: 'StudySound',
      image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500',
      description: 'Personalized focus music',
      tracks: fullTracks.slice(0, 6),
      fullTracks: fullTracks
    }];

  } catch (error) {
    console.error('Personalized recommendations failed:', error.response?.data || error.message);
    console.log('Using search fallback for personalized recommendations');
    // Return 4 real playlists from search
    return await getSearchFallbackPlaylists(token, 'study focus concentration', 4);
  }
}

// Update other recommendation functions similarly - remove complex logic:
async function getMoodRecommendations(token, mood) {
  try {
    const moodMap = {
      love: 'romantic',
      rage: 'rock',
      optimism: 'happy',
      joy: 'dance',
      nostalgia: '90s',
      confident: 'hip hop',
      'hyper craze': 'electronic',
      sad: 'acoustic'
    };

    const query = moodMap[mood] || 'chill';
    const params = new URLSearchParams({
      limit: '20',
      seed_genres: query,
      market: 'US'
    });

    const response = await axios.get(
      `https://api.spotify.com/v1/recommendations?${params}`,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const fullTracks = response.data.tracks.map(formatTrack).filter(Boolean);

    return [{
      id: `mood-${mood || 'chill'}`,
      title: `${(mood || 'chill').charAt(0).toUpperCase() + (mood || 'chill').slice(1)} Vibes`,
      artist: 'StudySound',
      image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500',
      description: `Perfect background for ${mood || 'chill'} moods`,
      tracks: fullTracks.slice(0, 6),
      fullTracks: fullTracks
    }];

  } catch (error) {
    console.error('Mood recommendations failed:', error.message);
    const moodMap = {
      love: 'romantic study',
      rage: 'intense focus', 
      optimism: 'upbeat study',
      joy: 'happy instrumental',
      nostalgia: 'vintage study',
      confident: 'powerful focus',
      'hyper craze': 'energetic electronic',
      sad: 'calm piano'
    };
    const query = moodMap[mood] || 'study focus';
    return await getSearchFallbackPlaylists(token, query, 4);
  }
}

// Similar simple updates for getWorkloadRecommendations and getFocusRecommendations...
async function getWorkloadRecommendations(token, workload = 'moderate') {
  try {
    const config = {
      light: { energy: 0.8 },
      moderate: { energy: 0.6 },
      heavy: { energy: 0.3 }
    }[workload] || { energy: 0.6 };

    const params = new URLSearchParams({
      limit: '20',
      seed_genres: 'study,chill',
      target_energy: config.energy,
      market: 'US'
    });

    const response = await axios.get(
      `https://api.spotify.com/v1/recommendations?${params}`,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const fullTracks = response.data.tracks.map(formatTrack).filter(Boolean);

    return [{
      id: `workload-${workload}`,
      title: `${workload.charAt(0).toUpperCase() + workload.slice(1)} Workload`,
      artist: 'StudySound',
      image: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=500',
      description: `Optimized for ${workload} workload`,
      tracks: fullTracks.slice(0, 6),
      fullTracks: fullTracks
    }];

  } catch (error) {
    console.error('Workload recommendations failed:', error.message);
    const workloadMap = {
      light: 'upbeat pop',
      moderate: 'chill rnb', 
      heavy: 'focus classical'
    };
    const query = workloadMap[workload] || 'study';
    return await getSearchFallbackPlaylists(token, query, 4);
  }
}

async function getFocusRecommendations(token, focusLevel, studyHours) {
  try {
    const focusMap = {
      low: 'pop',
      medium: 'chill', 
      high: 'ambient'
    };

    const genre = focusMap[focusLevel] || 'chill';
    const params = new URLSearchParams({
      limit: '20',
      seed_genres: genre,
      market: 'US'
    });

    const response = await axios.get(
      `https://api.spotify.com/v1/recommendations?${params}`,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const fullTracks = response.data.tracks.map(formatTrack).filter(Boolean);

    return [{
      id: `focus-${focusLevel}-${studyHours}h`,
      title: `${focusLevel.charAt(0).toUpperCase() + focusLevel.slice(1)} Focus`,
      artist: 'StudySound',
      image: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=500',
      description: `Perfect for ${studyHours} hours of ${focusLevel} focus`,
      tracks: fullTracks.slice(0, 6),
      fullTracks: fullTracks
    }];

  } catch (error) {
    console.error('Focus recommendations failed:', error.message);
    const focusMap = {
      low: 'rnb smooth',
      medium: 'classical jazz',
      high: 'deep work ambient'
    };
    const query = focusMap[focusLevel] || 'study focus';
    return await getSearchFallbackPlaylists(token, query, 4);
  }
}

// get playlist tracks
router.get('/playlist/:id/tracks', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const token = await getValidSpotifyToken(req.user);

    // Handle virtual playlists (return empty tracks)
    if (id.startsWith('mock-') || id.startsWith('personalized') || 
        id.startsWith('mood-') || id.startsWith('workload-') || 
        id.includes('-focus-') || id === 'search-fallback' || id === 'fallback') {
      return res.json({ tracks: [], total: 0 });
    }

    // Handle virtual album playlists
    if (id.startsWith('album-')) {
      // const albumId = id.slice(6);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const response = await axios.get(
        `https://api.spotify.com/v1/albums/${albumId}/tracks`,
        {
          params: { limit, offset },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const tracks = response.data.items.map(formatTrack).filter(Boolean);

      return res.json({
        tracks,
        total: response.data.total,
        limit,
        offset
      });
    }

    // Normal Spotify playlist
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${id}/tracks`,
      {
        params: { limit, offset },
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const tracks = response.data.items
      .map(item => formatTrack(item.track))
      .filter(Boolean);

    res.json({
      tracks,
      total: response.data.total,
      limit,
      offset
    });

  } catch (error) {
    console.error('Playlist/Album tracks error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

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
    if (!req.user.hasSpotify) return res.status(400).json({ error: 'Spotify not connected' });
    const token = await getValidSpotifyToken(req.user);
    const result = await getPersonalizedRecommendations(token);
    res.json(result); // keep array format for consistency with your frontend
  } catch (error) {
    console.error('Recommendations error:', error.message);
    res.json(mockPlaylists);
  }
});

// Mood playlists - returns mood-based recommendations
router.post('/mood-playlists', auth, async (req, res) => {
  try {
    const { mood } = req.body;
    if (!req.user.hasSpotify) return res.status(400).json({ error: 'Spotify not connected' });
    const token = await getValidSpotifyToken(req.user);
    const result = await getMoodRecommendations(token, mood);
    res.json(result);
  } catch (error) {
    console.error('Mood playlists error:', error.message);
    res.json([mockPlaylists[0]]);
  }
});

// Workload playlists - returns workload-based recommendations
router.post('/workload-playlists', auth, async (req, res) => {
  try {
    const { workload } = req.body;
    if (!req.user.hasSpotify) return res.status(400).json({ error: 'Spotify not connected' });
    const token = await getValidSpotifyToken(req.user);
    const result = await getWorkloadRecommendations(token, workload);
    res.json(result);
  } catch (error) {
    console.error('Workload playlists error:', error.message);
    res.json([mockPlaylists[0]]);
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

// Create real Spotify playlist from any virtual one
router.post('/create-real-playlist', auth, async (req, res) => {
  try {
    const { playlistId, name } = req.body;
    if (!req.user.hasSpotify) return res.status(400).json({ error: 'Spotify not connected' });

    const token = await getValidSpotifyToken(req.user);
    const userRes = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const userId = userRes.data.id;

    let fullTracks = [];

    if (playlistId === 'personalized-recommendations') {
      const rec = await getPersonalizedRecommendations(token);
      fullTracks = rec[0].fullTracks;
    } else if (playlistId.startsWith('mood-')) {
      const mood = playlistId.replace('mood-', '');
      const rec = await getMoodRecommendations(token, mood);
      fullTracks = rec[0].fullTracks;
    } else if (playlistId.startsWith('workload-')) {
      const workload = playlistId.replace('workload-', '');
      const rec = await getWorkloadRecommendations(token, workload);
      fullTracks = rec[0].fullTracks;
    }

    if (!fullTracks || fullTracks.length === 0) {
      return res.status(400).json({ error: 'No tracks found' });
    }

    const playlistName = name || 'StudySound • Focus Playlist';

    const playlist = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      { name: playlistName, public: false, description: 'Created with StudySound' },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    const uris = fullTracks.map(t => t.uri);
    for (let i = 0; i < uris.length; i += 100) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlist.data.id}/tracks`,
        { uris: uris.slice(i, i + 100) },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
    }

    res.json({ success: true, playlist: playlist.data });
  } catch (error) {
    console.error('Create playlist error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

module.exports = router;