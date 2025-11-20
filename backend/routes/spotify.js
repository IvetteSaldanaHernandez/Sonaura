const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Mock data fallback
const mockPlaylists = [
  {
    id: 'mock-1',
    title: "study vibes 📝✨",
    artist: "Study Beats",
    image: "https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c891105886a4cf239fa460598",
    description: "Minimal ambient sounds for intense concentration sessions"
  },
  {
    id: 'mock-2',
    title: "Lo-Fi Study Session",
    artist: "Chillhop Music",
    image: "https://preview.redd.it/lofi-girl-changed-her-cat-why-v0-pkw275c61x3c1.jpg?width=640&crop=smart&auto=webp&s=5bc5032a7acaaf06e02a4307afe1c201fb885461",
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
      headers: { 'Authorization': `Bearer ${user.spotifyAccessToken}` }
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
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
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

//Fetch ALL tracks from a Spotify playlist
async function fetchAllPlaylistTracks(token, playlistId, maxTracks = 200) {
  let allTracks = [];
  let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
  
  while (nextUrl && allTracks.length < maxTracks) {
    const response = await axios.get(nextUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const batchTracks = response.data.items
      .map(item => item.track ? formatTrack(item.track) : null)
      .filter(track => track !== null);
    
    allTracks = [...allTracks, ...batchTracks];
    nextUrl = response.data.next;
    
    if (!nextUrl || allTracks.length >= maxTracks) break;
  }

  return allTracks;
}

// Fetch ALL tracks from a Spotify album
async function fetchAllAlbumTracks(token, albumId, maxTracks = 200) {
  let allTracks = [];
  let nextUrl = `https://api.spotify.com/v1/albums/${albumId}/tracks`;
  
  while (nextUrl && allTracks.length < maxTracks) {
    const response = await axios.get(nextUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const batchTracks = response.data.items
      .map(track => formatTrack(track))
      .filter(track => track !== null);
    
    allTracks = [...allTracks, ...batchTracks];
    nextUrl = response.data.next;
    
    if (!nextUrl || allTracks.length >= maxTracks) break;
  }

  return allTracks;
}

// Get user's recently played playlists
async function getUserRecentlyPlayedPlaylists(token, limit = 4) {
  try {
    const recentlyPlayedResponse = await axios.get(
      `https://api.spotify.com/v1/me/player/recently-played?limit=10`,
      { headers: { 'Authorization': `Bearer ${token}` } }
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
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          // Get ALL tracks from the playlist
          const tracks = await fetchAllPlaylistTracks(token, playlistId);

          return {
            id: playlistResponse.data.id,
            title: playlistResponse.data.name || 'Unknown Playlist',
            artist: playlistResponse.data.owner?.display_name || 'Spotify',
            image: playlistResponse.data.images?.[0]?.url || null,
            description: playlistResponse.data.description || '',
            uri: playlistResponse.data.uri || '',
            external_url: playlistResponse.data.external_urls?.spotify || '',
            tracks: tracks // ALL tracks
          };
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
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const albumPlaylists = await Promise.all(
      savedAlbumsResponse.data.items.map(async (item) => {
        const album = item.album;
        
        try {
          // Get ALL tracks from the album
          const tracks = await fetchAllAlbumTracks(token, album.id);

          return {
            id: `album-${album.id}`,
            title: album.name,
            artist: album.artists.map(a => a.name).join(', '),
            image: album.images?.[0]?.url || null,
            description: `Album • ${album.release_date?.split('-')[0] || 'Unknown Year'}`,
            tracks: tracks // ALL tracks
          };
        } catch (err) {
          console.error(`Failed to load tracks for album ${album.id}:`, err.message);
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

// Search for playlists and get ALL tracks
async function getSearchFallbackPlaylists(token, query = 'study', limit = 4) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}&market=US`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    if (!response.data?.playlists?.items || response.data.playlists.items.length === 0) {
      throw new Error('No playlists found');
    }

    const playlists = await Promise.all(
      response.data.playlists.items.slice(0, limit).map(async (playlist) => {
        if (!playlist?.id) return null;

        try {
          // Get ALL tracks from the playlist
          const tracks = await fetchAllPlaylistTracks(token, playlist.id);

          return {
            id: playlist.id,
            title: playlist.name || 'Unknown Playlist',
            artist: playlist.owner?.display_name || 'Spotify',
            image: playlist.images?.[0]?.url || null,
            description: playlist.description || `Curated ${query} playlist`,
            uri: playlist.uri || '',
            external_url: playlist.external_urls?.spotify || '',
            tracks: tracks // ALL tracks
          };
        } catch (err) {
          console.error(`Failed to load tracks for playlist ${playlist.id}:`, err.message);
          return null;
        }
      })
    );

    const validPlaylists = playlists.filter(playlist => playlist !== null);
    
    // Ensure we return exactly limit playlists
    if (validPlaylists.length >= limit) {
      return validPlaylists.slice(0, limit);
    }
    
    // If we need more playlists, use mock data as fallback
    const needed = limit - validPlaylists.length;
    const mockPlaylistsToAdd = mockPlaylists.slice(0, needed).map((mock, index) => ({
      ...mock,
      id: `mock-${index}`,
      tracks: []
    }));
    
    return [...validPlaylists, ...mockPlaylistsToAdd].slice(0, limit);

  } catch (error) {
    console.error('Search fallback failed:', error.message);
    return mockPlaylists.slice(0, limit).map((mock, index) => ({
      ...mock,
      id: `mock-fallback-${index}`,
      tracks: []
    }));
  }
}

// Get playlist tracks - fetches ALL tracks with proper pagination
router.get('/playlist/:id/tracks', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const token = await getValidSpotifyToken(req.user);

    // Handle virtual album playlists
    if (id.startsWith('album-')) {
      const albumId = id.slice(6);
      const tracks = await fetchAllAlbumTracks(token, albumId);
      
      // Apply pagination
      const offset = parseInt(req.query.offset) || 0;
      const limit = parseInt(req.query.limit);
      const paginatedTracks = tracks.slice(offset, offset + limit);

      return res.json({
        tracks: paginatedTracks,
        total: tracks.length,
        limit,
        offset
      });
    }

    // Normal Spotify playlist - get ALL tracks
    const tracks = await fetchAllPlaylistTracks(token, id);
    
    // Apply pagination
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit);
    const paginatedTracks = tracks.slice(offset, offset + limit);

    res.json({
      tracks: paginatedTracks,
      total: tracks.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Playlist tracks error:', error.response?.data || error.message);
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

// Recommendations
async function getPersonalizedRecommendations(token) {
  try {
    const params = new URLSearchParams({
      limit: '20',
      seed_genres: 'study,ambient,chill',
      market: 'US'
    });

    const response = await axios.get(
      `https://api.spotify.com/v1/recommendations?${params}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    const tracks = response.data.tracks.map(formatTrack).filter(Boolean);

    return [{
      id: 'personalized-recommendations',
      title: 'Made For You',
      artist: 'StudySound',
      image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500',
      description: 'Personalized focus music',
      tracks: tracks // ALL tracks
    }];

  } catch (error) {
    console.error('Personalized recommendations failed:', error.message);
    return await getSearchFallbackPlaylists(token, 'study playlist', 4);
  }
}

router.get('/recommendations', auth, async (req, res) => {
  try {
    if (!req.user.hasSpotify) return res.status(400).json({ error: 'Spotify not connected' });
    const token = await getValidSpotifyToken(req.user);
    const result = await getPersonalizedRecommendations(token);
    res.json(result);
  } catch (error) {
    console.error('Recommendations error:', error.message);
    res.json(mockPlaylists.slice(0, 1));
  }
});

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

    const query = moodMap[mood];
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
      id: `mood-${mood}`,
      title: `${(mood).charAt(0).toUpperCase() + (mood).slice(1)} Vibes`,
      artist: 'StudySound',
      image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500',
      description: `Perfect background for ${mood} moods`,
      tracks: fullTracks.slice(0, 6),
      fullTracks: fullTracks
    }];

  } catch (error) {
    console.error('Mood recommendations failed:', error.message);
    const moodMap = {
      love: 'love songs',
      rage: 'intense rage', 
      optimism: 'optimistic pop',
      joy: 'bedroom pop',
      nostalgia: 'vintage nostalgia',
      confident: 'powerful confidence',
      'hyper craze': 'girly techno pop',
      sad: 'sad angst'
    };
    const query = moodMap[mood] || 'for me';
    return await getSearchFallbackPlaylists(token, query, 4);
  }
}

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
      light: 'girly pop',
      moderate: 'rnb playlist', 
      heavy: 'instrumental'
    };
    const query = workloadMap[workload];
    return await getSearchFallbackPlaylists(token, query, 4);
  }
}

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
      high: 'adhd'
    };
    const query = focusMap[focusLevel];
    return await getSearchFallbackPlaylists(token, query, 4);
  }
}

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

module.exports = router;