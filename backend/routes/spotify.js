const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { spotifyAuthMiddleware } = require('../middleware/spotifyAuth');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs');
const router = express.Router();

// Initialize Spotify API
// const spotifyApi = new SpotifyWebApi({
//   clientId: process.env.SPOTIFY_CLIENT_ID,
//   clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
//   redirectUri: process.env.SPOTIFY_REDIRECT_URI
// });

// Get Spotify login URL
router.get('/auth-url', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-recently-played',
    'user-library-read',
    'user-top-read',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-read-currently-playing',
    'user-read-playback-state'
  ];

  const authUrl = spotifyApi.createAuthorizeURL(scopes, 'state');
  console.log('Generated auth URL with scopes:', scopes)
  res.json({ authUrl });
});

// Handle Spotify callback
router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Exchange code for tokens
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    spotifyApi.setAccessToken(access_token);

    // Get Spotify user info
    const spotifyUser = await spotifyApi.getMe();

    // Create or update user in database
    let user = await User.findOne({ spotifyId: spotifyUser.body.id });
    if (!user) {
      // Generate a random password for Spotify-only users
      const tempPassword = await bcrypt.hash(Math.random().toString(36), 12);

      user = new User({
        username: spotifyUser.body.display_name || `spotify_${spotifyUser.body.id}`,
        password: tempPassword,
        spotifyId: spotifyUser.body.id,
        spotifyToken: access_token,
        spotifyRefreshToken: refresh_token
      });
      await user.save();
    } else {
      user.spotifyToken = access_token;
      user.spotifyRefreshToken = refresh_token;
      await user.save();
    }

    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token: jwtToken,
      access_token,
      refresh_token,
      expires_in,
      user: {
        id: user._id,
        username: user.username,
        spotifyId: user.spotifyId
      }
    });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Spotify: ' + error.message });
  }
});

// Connect Spotify to user account
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Exchange code for tokens
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    spotifyApi.setAccessToken(access_token);
    const spotifyUser = await spotifyApi.getMe();

    // Update current user with Spotify info
    req.user.spotifyId = spotifyUser.body.id;
    req.user.spotifyToken = access_token;
    req.user.spotifyRefreshToken = refresh_token;
    await req.user.save();

    res.json({
      message: 'Spotify connected successfully',
      access_token,
      refresh_token,
      expires_in,
      spotifyUser: {
        id: spotifyUser.body.id,
        display_name: spotifyUser.body.display_name
      }
    });
  } catch (error) {
    console.error('Spotify connect error:', error);
    res.status(500).json({ error: 'Failed to connect Spotify account: ' + error.message });
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
    
    // Simple fallback
    const fallbackTracks = [
      {
        title: "Study Focus",
        artist: "Various Artists",
        image: ""
      },
      {
        title: "Lo-Fi Beats",
        artist: "Chillhop Music", 
        image: ""
      },
      {
        title: "Deep Concentration",
        artist: "Focus Flow",
        image: ""
      },
      {
        title: "Productivity Mix",
        artist: "Work Sounds",
        image: ""
      }
    ];
    
    res.json(fallbackTracks);
  }
});

// Get liked albums
router.get('/liked-albums', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    // Get user's saved albums (this is what "liked albums" typically means)
    const savedAlbums = await req.spotifyApi.getMySavedAlbums({ limit: 4 });
    
    const albums = savedAlbums.body.items.map(item => ({
      title: item.album.name,
      artist: item.album.artists.map(artist => artist.name).join(', '),
      image: item.album.images[0]?.url || ''
    }));

    res.json(albums);
  } catch (error) {
    console.error('❌ Liked albums error:', error);
    
    // Fallback study playlists
    const fallbackPlaylists = [
      {
        title: "Lo-Fi Beats",
        artist: "Chillhop Music",
        image: ""
      },
      {
        title: "Deep Focus",
        artist: "Spotify",
        image: ""
      },
      {
        title: "Jazz for Study",
        artist: "Jazz Vibes",
        image: ""
      },
      {
        title: "Classical Study",
        artist: "Peaceful Piano",
        image: ""
      }
    ];
    
    console.log('✅ Returning fallback liked albums');
    res.json(fallbackPlaylists);
  }
});

router.get('/recommendations', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  console.log('=== RECOMMENDATIONS START ===');
  
  try {
    // Get featured playlists for recommendations
    console.log('Getting featured playlists...');
    const featuredPlaylists = await req.spotifyApi.getFeaturedPlaylists({ limit: 4 });
    
    console.log('✅ Featured playlists found:', featuredPlaylists.body.playlists.items.length);

    const playlists = featuredPlaylists.body.playlists.items.map(playlist => ({
      title: playlist.name,
      artist: playlist.owner.display_name,
      image: playlist.images[0]?.url || ''
    }));

    console.log('=== RECOMMENDATIONS SUCCESS ===');
    res.json(playlists);
    
  } catch (error) {
    console.error('❌ RECOMMENDATIONS FAILED:');
    console.error('Error:', error.message);
    
    // Return fallback playlists
    const fallbackPlaylists = [
      {
        title: "Discover Weekly",
        artist: "Spotify",
        image: ""
      },
      {
        title: "Release Radar", 
        artist: "Spotify",
        image: ""
      },
      {
        title: "Daily Mix 1",
        artist: "Spotify", 
        image: ""
      },
      {
        title: "Study Focus",
        artist: "Curated Playlist",
        image: ""
      }
    ];
    
    console.log('✅ Returning fallback playlists');
    res.json(fallbackPlaylists);
  }
});

router.post('/mood-playlists', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    const { mood } = req.body;
    console.log('🎵 Fetching mood playlists for:', mood);

    const moodSearchTerms = {
      love: 'love',
      rage: 'rock',
      optimism: 'happy',
      joy: 'joy',
      nostalgia: 'nostalgic',
      confident: 'confidence',
      'hyper craze': 'energy',
      sad: 'sad'
    };

    const searchTerm = moodSearchTerms[mood] || 'study';
    
    try {
      // Try to search for playlists
      const playlists = await req.spotifyApi.searchPlaylists(searchTerm, { limit: 4 });
      console.log('✅ Mood playlists found:', playlists.body.playlists.items.length);

      const playlistData = playlists.body.playlists.items.map(playlist => ({
        title: playlist.name,
        artist: playlist.owner.display_name,
        image: playlist.images[0]?.url || '',
        id: playlist.id
      }));

      return res.json(playlistData);
    } catch (searchError) {
      console.log('❌ Playlist search failed, using track-based recommendations');
      
      // Fallback to track recommendations with mood mapping
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

      try {
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

        return res.json(tracks);
      } catch (recError) {
        console.log('❌ Track recommendations also failed, using final fallback');
        throw recError; // This will trigger the final fallback
      }
    }
    
  } catch (error) {
    console.error('❌ Mood playlists error:', error);
    
    // FINAL FALLBACK - FIXED VARIABLE SCOPE
    const { mood } = req.body; // Get mood from request body
    
    const fallbackPlaylists = [
      {
        title: `${mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : 'Study'} Vibes`,
        artist: "Spotify",
        image: ""
      },
      {
        title: `Mood: ${mood || 'Focus'}`,
        artist: "Curated Playlist",
        image: ""
      },
      {
        title: `${mood || 'Study'} Mix`,
        artist: "Study Sounds",
        image: ""
      },
      {
        title: `Focus ${mood || 'Radio'}`,
        artist: "Productivity Radio",
        image: ""
      }
    ];
    
    console.log('✅ Returning final fallback mood playlists');
    res.json(fallbackPlaylists);
  }
});

// Get playlists by workload
router.post('/workload-playlists', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    const { workload } = req.body;
    console.log('📚 Fetching workload playlists for:', workload);

    try {
      // Try to search for playlists
      const searchTerm = workload === 'heavy' ? 'classical' : 
                        workload === 'moderate' ? 'focus' : 'chill';
      
      const playlists = await req.spotifyApi.searchPlaylists(searchTerm, { limit: 4 });
      console.log('✅ Workload playlists found:', playlists.body.playlists.items.length);

      const playlistData = playlists.body.playlists.items.map(playlist => ({
        title: playlist.name,
        artist: playlist.owner.display_name,
        image: playlist.images[0]?.url || '',
        id: playlist.id
      }));

      return res.json(playlistData);
    } catch (searchError) {
      console.log('❌ Playlist search failed, using track-based recommendations');
      
      // Fallback to track recommendations
      const workloadConfigs = {
        light: { genres: 'chill,lounge', energy: 0.3, valence: 0.7 },
        moderate: { genres: 'indie-pop,alternative', energy: 0.5, valence: 0.6 },
        heavy: { genres: 'classical,ambient', energy: 0.2, valence: 0.5 }
      };

      const config = workloadConfigs[workload] || { genres: 'study', energy: 0.4, valence: 0.5 };

      try {
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

        return res.json(tracks);
      } catch (recError) {
        console.log('❌ Track recommendations also failed, using final fallback');
        throw recError;
      }
    }
    
  } catch (error) {
    console.error('❌ Workload playlists error:', error);
    
    // FINAL FALLBACK - FIXED VARIABLE SCOPE
    const { workload } = req.body;
    
    const fallbackPlaylists = [
      {
        title: `${workload ? workload.charAt(0).toUpperCase() + workload.slice(1) : 'Study'} Workload Focus`,
        artist: "Study Beats",
        image: ""
      },
      {
        title: `${workload || 'Study'} Session`,
        artist: "Focus Music",
        image: ""
      },
      {
        title: `Productivity ${workload || 'Mix'}`,
        artist: "Work Sounds",
        image: ""
      },
      {
        title: `${workload || 'Deep'} Concentration`,
        artist: "Ambient Radio",
        image: ""
      }
    ];
    
    console.log('✅ Returning final fallback workload playlists');
    res.json(fallbackPlaylists);
  }
});

// Get playlists by focus level
router.post('/focus-playlists', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    const { focusLevel, studyHours } = req.body;
    console.log('🎯 Fetching focus playlists for:', focusLevel, 'hours:', studyHours);

    try {
      // Try to search for playlists
      const searchTerm = focusLevel === 'high' ? 'lofi' : 
                        focusLevel === 'medium' ? 'focus' : 'upbeat';
      
      const playlists = await req.spotifyApi.searchPlaylists(searchTerm, { limit: 4 });
      console.log('✅ Focus playlists found:', playlists.body.playlists.items.length);

      const playlistData = playlists.body.playlists.items.map(playlist => ({
        title: playlist.name,
        artist: playlist.owner.display_name,
        image: playlist.images[0]?.url || '',
        id: playlist.id
      }));

      return res.json(playlistData);
    } catch (searchError) {
      console.log('❌ Playlist search failed, using track-based recommendations');
      
      // Fallback to track recommendations
      const focusConfigs = {
        low: { genres: 'upbeat-pop,indie', energy: 0.7, valence: 0.8 },
        medium: { genres: 'indie,alternative', energy: 0.5, valence: 0.6 },
        high: { genres: 'classical,ambient,lo-fi', energy: 0.3, valence: 0.5 }
      };

      const config = focusConfigs[focusLevel] || { genres: 'study', energy: 0.4, valence: 0.5 };

      try {
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

        return res.json(tracks);
      } catch (recError) {
        console.log('❌ Track recommendations also failed, using final fallback');
        throw recError;
      }
    }
    
  } catch (error) {
    console.error('❌ Focus playlists error:', error);
    
    // FINAL FALLBACK - FIXED VARIABLE SCOPE
    const { focusLevel, studyHours } = req.body;
    
    const fallbackPlaylists = [
      {
        title: `${focusLevel ? focusLevel.charAt(0).toUpperCase() + focusLevel.slice(1) : 'Deep'} Focus Mix`,
        artist: "Study Radio",
        image: ""
      },
      {
        title: `${focusLevel || 'High'} Concentration`,
        artist: "Focus Beats",
        image: ""
      },
      {
        title: `${studyHours || '2'} Hour Study Session`,
        artist: "Productivity Sounds",
        image: ""
      },
      {
        title: `${focusLevel || 'Study'} Energy Mix`,
        artist: "Ambient Focus",
        image: ""
      }
    ];
    
    console.log('✅ Returning final fallback focus playlists');
    res.json(fallbackPlaylists);
  }
});

// Add this route for debugging
router.get('/debug-token', authMiddleware, async (req, res) => {
  try {
    console.log('=== DEBUG TOKEN ===');
    console.log('User:', req.user.username);
    console.log('Has Spotify ID:', !!req.user.spotifyId);
    console.log('Has Spotify Token:', !!req.user.spotifyToken);
    console.log('Has Spotify Refresh Token:', !!req.user.spotifyRefreshToken);
    
    if (req.user.spotifyToken) {
      // Test if token works
      const spotifyApi = new SpotifyWebApi();
      spotifyApi.setAccessToken(req.user.spotifyToken);
      
      try {
        const me = await spotifyApi.getMe();
        console.log('Spotify token valid for user:', me.body.display_name);
        res.json({ 
          status: 'valid', 
          spotifyUser: me.body.display_name,
          hasToken: true 
        });
      } catch (spotifyError) {
        console.log('Spotify token invalid:', spotifyError.message);
        res.json({ 
          status: 'invalid', 
          error: spotifyError.message,
          hasToken: true 
        });
      }
    } else {
      res.json({ status: 'no_token' });
    }
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug scopes and permissions
router.get('/debug-scopes', authMiddleware, spotifyAuthMiddleware, async (req, res) => {
  try {
    console.log('=== DEBUG SCOPES ===');
    
    // Test various endpoints to see what works
    const tests = {};
    
    try {
      const me = await req.spotifyApi.getMe();
      tests.getMe = '✅ Works';
    } catch (e) {
      tests.getMe = `❌ Failed: ${e.message}`;
    }
    
    try {
      const recent = await req.spotifyApi.getMyRecentlyPlayedTracks({ limit: 1 });
      tests.recentlyPlayed = '✅ Works';
    } catch (e) {
      tests.recentlyPlayed = `❌ Failed: ${e.message}`;
    }
    
    try {
      const savedAlbums = await req.spotifyApi.getMySavedAlbums({ limit: 1 });
      tests.savedAlbums = '✅ Works';
    } catch (e) {
      tests.savedAlbums = `❌ Failed: ${e.message}`;
    }
    
    try {
      const topTracks = await req.spotifyApi.getMyTopTracks({ limit: 1 });
      tests.topTracks = '✅ Works';
    } catch (e) {
      tests.topTracks = `❌ Failed: ${e.message}`;
    }
    
    console.log('Scope test results:', tests);
    res.json({ tests });
    
  } catch (error) {
    console.error('Scope debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;