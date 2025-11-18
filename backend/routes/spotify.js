const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Get Spotify auth URL
router.get('/auth-url', (req, res) => {
  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent('user-read-private user-read-email user-read-recently-played user-library-read playlist-read-private playlist-read-collaborative')}` +
    `&show_dialog=true`;
  
  res.json({ authUrl });
});

// Initial login with Spotify
router.get('/login', (req, res) => {
  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${process.env.SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent('user-read-private user-read-email user-read-recently-played user-library-read playlist-read-private playlist-read-collaborative')}`;
  
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
    await user.save();
    
    return response.data.access_token;
  } catch (error) {
    throw new Error('Failed to refresh Spotify token');
  }
}

// Get valid Spotify token
async function getValidSpotifyToken(user) {
  try {
    // Test current token
    await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${user.spotifyAccessToken}`
      }
    });
    return user.spotifyAccessToken;
  } catch (error) {
    // Token expired, refresh it
    return await refreshSpotifyToken(user);
  }
}

// Mock data for demonstration
const mockPlaylists = [
  {
    title: "Deep Focus",
    artist: "Study Beats",
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300",
    description: "Concentration enhancing tracks"
  },
  {
    title: "Lo-Fi Study",
    artist: "Chillhop Music",
    image: "https://images.unsplash.com/photo-1571974599782-87624638275f?w=300",
    description: "Relaxing lo-fi beats"
  },
  {
    title: "Productivity Boost",
    artist: "Focus Flow",
    image: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=300",
    description: "Energetic focus music"
  }
];

// Recently played endpoint
router.get('/recently-played', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    // For now, return mock data - you can replace this with actual Spotify API calls
    res.json(mockPlaylists);
    
  } catch (error) {
    console.error('Recently played error:', error);
    res.status(500).json({ error: 'Failed to fetch recently played' });
  }
});

// Liked albums endpoint
router.get('/liked-albums', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    // Mock data - replace with actual Spotify API
    res.json(mockPlaylists);
    
  } catch (error) {
    console.error('Liked albums error:', error);
    res.status(500).json({ error: 'Failed to fetch liked albums' });
  }
});

// Recommendations endpoint
router.get('/recommendations', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    // Mock data - replace with actual Spotify API
    res.json(mockPlaylists);
    
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Mood playlists endpoint
router.post('/mood-playlists', auth, async (req, res) => {
  try {
    const { mood } = req.body;
    
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    // Mock data filtered by mood
    const moodPlaylists = mockPlaylists.map(playlist => ({
      ...playlist,
      title: `${mood.charAt(0).toUpperCase() + mood.slice(1)} ${playlist.title}`
    }));
    
    res.json(moodPlaylists);
    
  } catch (error) {
    console.error('Mood playlists error:', error);
    res.status(500).json({ error: 'Failed to fetch mood playlists' });
  }
});

// Workload playlists endpoint
router.post('/workload-playlists', auth, async (req, res) => {
  try {
    const { workload } = req.body;
    
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    // Mock data filtered by workload
    const workloadPlaylists = mockPlaylists.map(playlist => ({
      ...playlist,
      title: `${workload.charAt(0).toUpperCase() + workload.slice(1)} Workload ${playlist.title}`
    }));
    
    res.json(workloadPlaylists);
    
  } catch (error) {
    console.error('Workload playlists error:', error);
    res.status(500).json({ error: 'Failed to fetch workload playlists' });
  }
});

// Focus level playlists endpoint
router.post('/focus-playlists', auth, async (req, res) => {
  try {
    const { focusLevel, studyHours } = req.body;
    
    if (!req.user.hasSpotify) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const token = await getValidSpotifyToken(req.user);
    
    // Mock data filtered by focus level
    const focusPlaylists = mockPlaylists.map(playlist => ({
      ...playlist,
      title: `${focusLevel.charAt(0).toUpperCase() + focusLevel.slice(1)} Focus (${studyHours}h) ${playlist.title}`
    }));
    
    res.json(focusPlaylists);
    
  } catch (error) {
    console.error('Focus playlists error:', error);
    res.status(500).json({ error: 'Failed to fetch focus playlists' });
  }
});

module.exports = router;