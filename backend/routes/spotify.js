const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { spotifyAuthMiddleware } = require('../middleware/spotifyAuth');

const router = express.Router();

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Get Spotify login URL
router.get('/auth-url', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-recently-played',
    'user-library-read',
    'user-top-read',
    'playlist-read-private'
  ];

  const authUrl = spotifyApi.createAuthorizeURL(scopes, 'state');
  res.json({ authUrl });
});

// Handle Spotify callback
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Exchange code for tokens
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;

    spotifyApi.setAccessToken(access_token);

    // Get Spotify user info
    const spotifyUser = await spotifyApi.getMe();

    // For now, we'll just return the tokens
    // In a real app, you'd associate this with your user
    res.json({
      access_token,
      refresh_token,
      spotifyUser: {
        id: spotifyUser.body.id,
        display_name: spotifyUser.body.display_name,
        email: spotifyUser.body.email
      }
    });
  } catch (error) {
    console.error('Spotify callback error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Spotify' });
  }
});

// Connect Spotify to user account
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;

    spotifyApi.setAccessToken(access_token);
    const spotifyUser = await spotifyApi.getMe();

    // Update user with Spotify info
    req.user.spotifyId = spotifyUser.body.id;
    req.user.spotifyToken = access_token;
    req.user.spotifyRefreshToken = refresh_token;
    await req.user.save();

    res.json({
      message: 'Spotify connected successfully',
      spotifyUser: {
        id: spotifyUser.body.id,
        display_name: spotifyUser.body.display_name
      }
    });
  } catch (error) {
    console.error('Spotify connect error:', error);
    res.status(500).json({ error: 'Failed to connect Spotify account' });
  }
});

// Get recently played tracks
router.get('/recently-played', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    const data = await req.spotifyApi.getMyRecentlyPlayedTracks({ limit: 4 });
    
    const tracks = data.body.items.map(item => ({
      title: item.track.name,
      artist: item.track.artists.map(artist => artist.name).join(', '),
      image: item.track.album.images[0]?.url || ''
    }));

    res.json(tracks);
  } catch (error) {
    console.error('Recently played error:', error);
    res.status(500).json({ error: 'Failed to fetch recently played tracks' });
  }
});

// Get liked albums
router.get('/liked-albums', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    const data = await req.spotifyApi.getMySavedAlbums({ limit: 4 });
    
    const albums = data.body.items.map(item => ({
      title: item.album.name,
      artist: item.album.artists.map(artist => artist.name).join(', '),
      image: item.album.images[0]?.url || ''
    }));

    res.json(albums);
  } catch (error) {
    console.error('Liked albums error:', error);
    res.status(500).json({ error: 'Failed to fetch liked albums' });
  }
});

// Get recommendations based on top tracks
router.get('/recommendations', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    // Get user's top tracks for seeds
    const topTracks = await req.spotifyApi.getMyTopTracks({ limit: 5 });
    const seedTracks = topTracks.body.items.slice(0, 2).map(track => track.id);

    // Get recommendations
    const recommendations = await req.spotifyApi.getRecommendations({
      seed_tracks: seedTracks,
      limit: 4,
      target_energy: 0.5,
      target_valence: 0.5
    });

    const tracks = recommendations.body.tracks.map(track => ({
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      image: track.album.images[0]?.url || ''
    }));

    res.json(tracks);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Get playlists by mood
router.post('/mood-playlists', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    const { mood } = req.body;

    const moodConfigs = {
      love: { genres: 'pop,romantic', energy: 0.4, valence: 0.8 },
      rage: { genres: 'rock,metal', energy: 0.9, valence: 0.3 },
      optimism: { genres: 'pop,indie-pop', energy: 0.7, valence: 0.8 },
      joy: { genres: 'dance,pop', energy: 0.8, valence: 0.9 },
      nostalgia: { genres: 'classic-rock,oldies', energy: 0.5, valence: 0.6 },
      confident: { genres: 'hip-hop,pop', energy: 0.8, valence: 0.7 },
      'hyper craze': { genres: 'edm,electronic', energy: 0.9, valence: 0.8 },
      sad: { genres: 'acoustic,indie', energy: 0.3, valence: 0.2 }
    };

    const config = moodConfigs[mood] || { genres: 'pop', energy: 0.5, valence: 0.5 };

    const recommendations = await req.spotifyApi.getRecommendations({
      seed_genres: config.genres.split(','),
      limit: 4,
      target_energy: config.energy,
      target_valence: config.valence
    });

    const tracks = recommendations.body.tracks.map(track => ({
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      image: track.album.images[0]?.url || ''
    }));

    res.json(tracks);
  } catch (error) {
    console.error('Mood playlists error:', error);
    res.status(500).json({ error: 'Failed to fetch mood playlists' });
  }
});

// Get playlists by workload
router.post('/workload-playlists', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    const { workload } = req.body;

    const workloadConfigs = {
      light: { genres: 'chill,lounge', energy: 0.3, valence: 0.7 },
      moderate: { genres: 'indie-pop,alternative', energy: 0.5, valence: 0.6 },
      heavy: { genres: 'classical,ambient', energy: 0.2, valence: 0.5 }
    };

    const config = workloadConfigs[workload] || { genres: 'study', energy: 0.4, valence: 0.5 };

    const recommendations = await req.spotifyApi.getRecommendations({
      seed_genres: config.genres.split(','),
      limit: 4,
      target_energy: config.energy,
      target_valence: config.valence
    });

    const tracks = recommendations.body.tracks.map(track => ({
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      image: track.album.images[0]?.url || ''
    }));

    res.json(tracks);
  } catch (error) {
    console.error('Workload playlists error:', error);
    res.status(500).json({ error: 'Failed to fetch workload playlists' });
  }
});

// Get playlists by focus level
router.post('/focus-playlists', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    const { focusLevel, studyHours } = req.body;

    const focusConfigs = {
      low: { genres: 'upbeat-pop,indie', energy: 0.7, valence: 0.8 },
      medium: { genres: 'indie,alternative', energy: 0.5, valence: 0.6 },
      high: { genres: 'classical,ambient,lo-fi', energy: 0.3, valence: 0.5 }
    };

    const config = focusConfigs[focusLevel] || { genres: 'study', energy: 0.4, valence: 0.5 };

    const recommendations = await req.spotifyApi.getRecommendations({
      seed_genres: config.genres.split(','),
      limit: 4,
      target_energy: config.energy,
      target_valence: config.valence
    });

    const tracks = recommendations.body.tracks.map(track => ({
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      image: track.album.images[0]?.url || ''
    }));

    res.json(tracks);
  } catch (error) {
    console.error('Focus playlists error:', error);
    res.status(500).json({ error: 'Failed to fetch focus playlists' });
  }
});

module.exports = router;

// const express = require('express');
// const axios = require('axios');
// const router = express.Router();
// const qs = require('querystring');  // For URL encoding

// // Endpoint to get auth URL (call from frontend)
// router.get('/auth', (req, res) => {
//   const scope = 'user-read-private user-read-email playlist-read-private';  // Add scopes as needed
//   const authUrl = `https://accounts.spotify.com/authorize?${qs.stringify({
//     response_type: 'code',
//     client_id: process.env.SPOTIFY_CLIENT_ID,
//     scope,
//     redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
//     state: 'random_state_string'  // For security
//   })}`;
//   res.json({ authUrl });
// });

// // Callback endpoint (frontend sends code here after redirect)
// router.post('/callback', async (req, res) => {
//   const { code } = req.body;
//   try {
//     const response = await axios.post('https://accounts.spotify.com/api/token', qs.stringify({
//       code,
//       redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
//       grant_type: 'authorization_code'
//     }), {
//       headers: {
//         Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
//         'Content-Type': 'application/x-www-form-urlencoded'
//       }
//     });
//     const { access_token, refresh_token } = response.data;
//     // Save to user in DB (e.g., find user by session and update)
//     res.json({ access_token, refresh_token });
//   } catch (err) {
//     res.status(500).json({ error: 'Auth failed' });
//   }
// });

// // Refresh token endpoint
// router.post('/refresh', async (req, res) => {
//   const { refresh_token } = req.body;
//   try {
//     const response = await axios.post('https://accounts.spotify.com/api/token', qs.stringify({
//       grant_type: 'refresh_token',
//       refresh_token
//     }), {
//       headers: {
//         Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
//         'Content-Type': 'application/x-www-form-urlencoded'
//       }
//     });
//     res.json(response.data);
//   } catch (err) {
//     res.status(500).json({ error: 'Refresh failed' });
//   }
// });

// router.post('/recommend', async (req, res) => {
//   const { access_token, mood, activity } = req.body;  // e.g., mood: 'focus', activity: 'high workload'
//   try {
//     // Map user input to Spotify params (e.g., seed_genres, target_energy)
//     const params = {
//       seed_genres: 'study,chill',  // Customize based on input
//       limit: 10,
//       target_energy: activity === 'high workload' ? 0.7 : 0.4  // Example mapping
//     };
//     const response = await axios.get(`https://api.spotify.com/v1/recommendations?${qs.stringify(params)}`, {
//       headers: { Authorization: `Bearer ${access_token}` }
//     });
//     res.json(response.data);
//   } catch (err) {
//     res.status(500).json({ error: 'Recommendation failed' });
//   }
// });

// module.exports = router;