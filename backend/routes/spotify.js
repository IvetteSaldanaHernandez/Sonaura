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

// Improved helper function to format playlist data with error handling
function formatPlaylist(playlist) {
  if (!playlist || !playlist.id) {
    console.log('Invalid playlist data:', playlist);
    return null;
  }
  
  try {
    return {
      id: playlist.id,
      title: playlist.name || 'Unknown Playlist',
      artist: playlist.owner?.display_name || 'Spotify',
      image: playlist.images?.[0]?.url || null,
      description: playlist.description || '',
      uri: playlist.uri || '',
      external_url: playlist.external_urls?.spotify || ''
    };
  } catch (error) {
    console.log('Error formatting playlist:', error);
    return null;
  }
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
    uri: track.uri,
    external_url: track.external_urls?.spotify
  };
}

// Helper function to format album data
function formatAlbum(album) {
  if (!album) return null;
  
  return {
    id: album.id,
    title: album.name,
    artist: album.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist',
    image: album.images?.[0]?.url || null,
    release_date: album.release_date,
    uri: album.uri,
    external_url: album.external_urls?.spotify
  };
}

// Enhanced debug function
function debugSpotifyError(error, endpoint) {
  console.log(`\n=== SPOTIFY API ERROR DEBUG: ${endpoint} ===`);
  console.log('Error message:', error.message);
  console.log('Error response status:', error.response?.status);
  console.log('Error response status text:', error.response?.statusText);
  console.log('Error response data:', error.response?.data);
  console.log('Error config URL:', error.config?.url);
  console.log('Error config headers:', error.config?.headers ? 'Present' : 'Missing');
  if (error.config?.headers?.Authorization) {
    console.log('Token present:', error.config.headers.Authorization.substring(0, 20) + '...');
  }
  console.log('=== END DEBUG ===\n');
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

// Refresh Spotify token if needed
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

// Get valid Spotify token
async function getValidSpotifyToken(user) {
  try {
    // Test current token with a simple API call
    await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${user.spotifyAccessToken}`
      }
    });
    return user.spotifyAccessToken;
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired, refresh it
      return await refreshSpotifyToken(user);
    }
    throw error;
  }
}

// Test endpoint to check Spotify connection
router.get('/test-connection', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) {
      return res.json({ connected: false, message: 'Spotify not connected in user profile' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    // Test basic API call
    const testResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    res.json({
      connected: true,
      user: testResponse.data,
      message: 'Spotify connection successful'
    });
    
  } catch (error) {
    debugSpotifyError(error, 'test-connection');
    res.json({
      connected: false,
      error: error.response?.data || error.message,
      message: 'Spotify connection failed'
    });
  }
});

// Helper function to process and limit playlists
function processPlaylists(playlists, limit = 4) {
  if (!playlists || !Array.isArray(playlists)) {
    return mockPlaylists.slice(0, limit);
  }
  
  const validPlaylists = playlists
    .map(formatPlaylist)
    .filter(playlist => playlist !== null && playlist.title !== 'Unknown Playlist');
  
  if (validPlaylists.length === 0) {
    return mockPlaylists.slice(0, limit);
  }
  
  return validPlaylists.slice(0, limit);
}

// Recently played endpoint with detailed debugging
router.get('/recently-played', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    try {
      console.log('=== RECENTLY PLAYED DEBUG ===');
      console.log('Token:', token.substring(0, 20) + '...');
      
      // Get recently played tracks
      const recentlyPlayedResponse = await axios.get(
        'https://api.spotify.com/v1/me/player/recently-played?limit=10',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Recently played success:', recentlyPlayedResponse.data.items.length, 'items');
      
      // Get recommendations based on recently played
      const searchResponse = await axios.get(
        'https://api.spotify.com/v1/search?q=study%20focus&type=playlist&limit=10',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Search success:', searchResponse.data.playlists.items.length, 'playlists');

      const playlists = processPlaylists(searchResponse.data.playlists.items, 4);
      res.json(playlists);
      
    } catch (spotifyError) {
      debugSpotifyError(spotifyError, 'recently-played');
      console.log('Using mock data for recently-played due to Spotify API error');
      res.json(mockPlaylists.slice(0, 4));
    }
    
  } catch (error) {
    console.error('Recently played overall error:', error.message);
    res.json(mockPlaylists.slice(0, 4));
  }
});

// Liked albums endpoint with detailed debugging
router.get('/liked-albums', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    try {
      console.log('=== LIKED ALBUMS DEBUG ===');
      
      // Get user's saved albums
      const savedAlbumsResponse = await axios.get(
        'https://api.spotify.com/v1/me/albums?limit=10',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Liked albums success:', savedAlbumsResponse.data.items.length, 'albums');

      // Get study/focus playlists via search
      const searchResponse = await axios.get(
        'https://api.spotify.com/v1/search?q=study%20focus%20concentration&type=playlist&limit=10',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Study playlists success:', searchResponse.data.playlists.items.length, 'playlists');

      const playlists = processPlaylists(searchResponse.data.playlists.items, 4);
      res.json(playlists);
      
    } catch (spotifyError) {
      debugSpotifyError(spotifyError, 'liked-albums');
      console.log('Using mock data for liked-albums due to Spotify API error');
      res.json(mockPlaylists.slice(0, 4));
    }
    
  } catch (error) {
    console.error('Liked albums overall error:', error.message);
    res.json(mockPlaylists.slice(0, 4));
  }
});

// Recommendations endpoint with detailed debugging
router.get('/recommendations', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    try {
      console.log('=== RECOMMENDATIONS DEBUG ===');
      
      // Get recommendations via search
      const searchResponse = await axios.get(
        'https://api.spotify.com/v1/search?q=focus%20study%20productivity&type=playlist&limit=10',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Recommendations search success:', searchResponse.data.playlists.items.length, 'playlists');

      const playlists = processPlaylists(searchResponse.data.playlists.items, 4);
      res.json(playlists);
      
    } catch (spotifyError) {
      debugSpotifyError(spotifyError, 'recommendations');
      console.log('Using mock data for recommendations due to Spotify API error');
      res.json(mockPlaylists.slice(0, 4));
    }
    
  } catch (error) {
    console.error('Recommendations overall error:', error.message);
    res.json(mockPlaylists.slice(0, 4));
  }
});

// Mood playlists endpoint with detailed debugging
router.post('/mood-playlists', auth, async (req, res) => {
  try {
    const { mood } = req.body;
    
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    try {
      console.log('=== MOOD PLAYLISTS DEBUG ===');
      console.log('Mood:', mood);
      
      // Search for mood-based playlists
      const searchResponse = await axios.get(
        `https://api.spotify.com/v1/search?q=${mood}%20study%20focus&type=playlist&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Mood search success:', searchResponse.data.playlists.items.length, 'playlists');

      const playlists = processPlaylists(searchResponse.data.playlists.items, 4);
      res.json(playlists);
      
    } catch (spotifyError) {
      debugSpotifyError(spotifyError, 'mood-playlists');
      console.log('Using mock data for mood-playlists due to Spotify API error');
      const moodPlaylists = mockPlaylists.map(playlist => ({
        ...playlist,
        title: `${mood.charAt(0).toUpperCase() + mood.slice(1)} ${playlist.title}`
      })).slice(0, 4);
      res.json(moodPlaylists);
    }
    
  } catch (error) {
    console.error('Mood playlists overall error:', error.message);
    const moodPlaylists = mockPlaylists.map(playlist => ({
      ...playlist,
      title: `${req.body.mood.charAt(0).toUpperCase() + req.body.mood.slice(1)} ${playlist.title}`
    })).slice(0, 4);
    res.json(moodPlaylists);
  }
});

// Workload playlists endpoint with detailed debugging
router.post('/workload-playlists', auth, async (req, res) => {
  try {
    const { workload } = req.body;
    
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    try {
      console.log('=== WORKLOAD PLAYLISTS DEBUG ===');
      console.log('Workload:', workload);
      
      // Search for workload-based playlists
      const searchTerms = {
        light: 'light%20study%20background%20calm',
        moderate: 'focus%20study%20productivity',
        heavy: 'deep%20focus%20intense%20concentration'
      };

      const searchTerm = searchTerms[workload] || 'study%20focus';
      const searchResponse = await axios.get(
        `https://api.spotify.com/v1/search?q=${searchTerm}&type=playlist&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Workload search success:', searchResponse.data.playlists.items.length, 'playlists');

      const playlists = processPlaylists(searchResponse.data.playlists.items, 4);
      res.json(playlists);
      
    } catch (spotifyError) {
      debugSpotifyError(spotifyError, 'workload-playlists');
      console.log('Using mock data for workload-playlists due to Spotify API error');
      const workloadPlaylists = mockPlaylists.map(playlist => ({
        ...playlist,
        title: `${workload.charAt(0).toUpperCase() + workload.slice(1)} Workload ${playlist.title}`
      })).slice(0, 4);
      res.json(workloadPlaylists);
    }
    
  } catch (error) {
    console.error('Workload playlists overall error:', error.message);
    const workloadPlaylists = mockPlaylists.map(playlist => ({
      ...playlist,
      title: `${req.body.workload.charAt(0).toUpperCase() + req.body.workload.slice(1)} Workload ${playlist.title}`
    })).slice(0, 4);
    res.json(workloadPlaylists);
  }
});

// Focus level playlists endpoint with detailed debugging
router.post('/focus-playlists', auth, async (req, res) => {
  try {
    const { focusLevel, studyHours } = req.body;
    
    console.log('=== FOCUS LEVEL REQUEST ===');
    console.log('Focus level:', focusLevel);
    console.log('Study hours:', studyHours);
    
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    try {
      console.log('=== FOCUS PLAYLISTS DEBUG ===');
      console.log('Token present:', !!token);
      
      // Search for focus-based playlists
      const searchTerms = {
        low: 'energetic%20study%20upbeat%20focus',
        medium: 'study%20focus%20concentration',
        high: 'deep%20focus%20instrumental%20calm'
      };

      const searchTerm = searchTerms[focusLevel] || 'study%20focus';
      const searchUrl = `https://api.spotify.com/v1/search?q=${searchTerm}&type=playlist&limit=10`;
      
      console.log('Search URL:', searchUrl);

      const searchResponse = await axios.get(
        searchUrl,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000
        }
      );

      console.log('Focus search success:', searchResponse.data.playlists.items.length, 'playlists');

      const playlists = processPlaylists(searchResponse.data.playlists.items, 4);
      res.json(playlists);
      
    } catch (spotifyError) {
      debugSpotifyError(spotifyError, 'focus-playlists');
      console.log('Using mock data for focus-playlists due to Spotify API error');
      const focusPlaylists = mockPlaylists.map(playlist => ({
        ...playlist,
        title: `${focusLevel.charAt(0).toUpperCase() + focusLevel.slice(1)} Focus (${studyHours}h) ${playlist.title}`
      })).slice(0, 4);
      res.json(focusPlaylists);
    }
    
  } catch (error) {
    console.error('Focus playlists overall error:', error.message);
    const focusPlaylists = mockPlaylists.map(playlist => ({
      ...playlist,
      title: `${req.body.focusLevel.charAt(0).toUpperCase() + req.body.focusLevel.slice(1)} Focus (${req.body.studyHours}h) ${playlist.title}`
    })).slice(0, 4);
    res.json(focusPlaylists);
  }
});

// Check user's Spotify tokens
router.get('/debug-user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      hasSpotify: user.hasSpotify,
      spotifyAccessToken: user.spotifyAccessToken ? 'Present' : 'Missing',
      spotifyRefreshToken: user.spotifyRefreshToken ? 'Present' : 'Missing',
      username: user.username
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;