require('dotenv').config(); // loads .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const SpotifyWebAPI = require('spotify-web-api-node');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// connect to MongoDB
mongoose.set('debug', true); // for debugging
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// spotify API setup
const spotifyApi = new SpotifyWebAPI({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// user model
const User = require('./models/User');

// middleware to verify JWT and set Spotify access token
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.spotifyToken) return res.status(403).json({ error: 'Spotify not connected' });

    spotifyApi.setAccessToken(user.spotifyToken);

    try {
      await spotifyApi.getMe(); // test token
    } catch (apiErr) {
      if (apiErr.statusCode === 401) {
        console.log('Token expired – refreshing...');
        await refreshAccessToken(user);
      } else {
        throw apiErr;
      }
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// REFRESH TOKEN IF EXPIRED
const refreshAccessToken = async (user) => {
  try {
    spotifyApi.setRefreshToken(user.spotifyRefreshToken);
    const data = await spotifyApi.refreshAccessToken();
    const newToken = data.body.access_token;

    user.spotifyToken = newToken;
    await user.save();

    spotifyApi.setAccessToken(newToken);
    return newToken;
  } catch (err) {
    console.error('Token refresh failed:', err);
    throw err;
  }
};

// routes
// get spotify login URL
app.get('/api/spotify/login', (req, res) => {
  const scopes = ['user-read-private', 
                  'user-read-email', 
                  'playlist-read-private',
                  'user-read-recently-played',
                  'user-library-read',
                  'user-top-read'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'some-state');
  res.json({ url: authorizeURL });
});

// handle callback
app.get('/api/spotify/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;
    // tokens for future API calls
    spotifyApi.setAccessToken(access_token);
    // spotifyApi.setRefreshToken(refresh_token);
    const spotifyUser = await spotifyApi.getMe();

    // Check if user exists in DB, or create new
    let user = await User.findOne({ spotifyId: spotifyUser.body.id });
    if (!user) {
      user = new User({
        username: spotifyUser.body.display_name || `spotify_user_${spotifyUser.body.id}`,
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

    // send tokens to frontend
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: jwtToken, access_token, refresh_token });
  } catch (err) {
    console.error('Spotify auth error:', err);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/spotify/liked-albums', authMiddleware, async (req, res) => {
  try {
    const data = await spotifyApi.getMySavedAlbums({ limit: 4 });
    const albums = data.body.items.map(item => ({
      title: item.album.name,
      artist: item.album.artists.map(a => a.name).join(', '),
      image: item.album.images[0]?.url || ''
    }));
    res.json(albums);
  } catch (err) {
    console.error('LIKED ALBUMS ERROR:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

// username/password signup
app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// username/password login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// connect Spotify to existing account
app.post('/api/spotify/connect', async (req, res) => {
  // const { userId, code } = req.body;
  const { code } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  try {
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;

    spotifyApi.setAccessToken(access_token);
    const spotifyUser = await spotifyApi.getMe();

    user.spotifyId = spotifyUser.body.id;
    user.spotifyToken = access_token;
    user.spotifyRefreshToken = refresh_token;
    await user.save();

    res.json({ access_token, refresh_token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/user/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, spotifyId: user.spotifyId });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Activity Endpoints
app.get('/api/spotify/recently-played', authMiddleware, async (req, res) => {
  try {
    const data = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 4 });
    const tracks = data.body.items.map(item => ({
      title: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      image: item.track.album.images[0]?.url || ''
    }));
    res.json(tracks);
  } catch (err) {
    console.error('RECENTLY PLAYED ERROR:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/spotify/recommendations', authMiddleware, async (req, res) => {
  try {
    const topTracks = await spotifyApi.getMyTopTracks({ limit: 5 });
    const seedTracks = topTracks.body.items.map(track => track.id).slice(0, 2);
    const data = await spotifyApi.getRecommendations({
      seed_tracks: seedTracks,
      limit: 4,
      target_energy: 0.5,
      target_valence: 0.5
    });
    const tracks = data.body.tracks.map(track => ({
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      image: track.album.images[0]?.url || ''
    }));
    res.json(tracks);
  } catch (err) {
    console.error('RECCOMMENDATION ERROR:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

// Mood Endpoint
app.post('/api/spotify/mood-playlists', authMiddleware, async (req, res) => {
  const { mood } = req.body;
  try {
    const moodConfigs = {
      love: { genres: 'pop,romantic', energy: 0.4, valence: 0.6 },
      rage: { genres: 'rock,metal', energy: 0.9, valence: 0.3 },
      optimism: { genres: 'pop,indie-pop', energy: 0.7, valence: 0.8 },
      joy: { genres: 'dance,pop', energy: 0.8, valence: 0.9 },
      nostalgia: { genres: 'retro,classic-rock', energy: 0.5, valence: 0.5 },
      confident: { genres: 'pop,hip-hop', energy: 0.8, valence: 0.7 },
      'hyper craze': { genres: 'edm,electronic', energy: 0.9, valence: 0.8 },
      sad: { genres: 'acoustic,indie', energy: 0.3, valence: 0.2 }
    };

    const config = moodConfigs[mood] || { genres: 'pop', energy: 0.5, valence: 0.5 };
    const data = await spotifyApi.getRecommendations({
      seed_genres: config.genres,
      limit: 4,
      target_energy: config.energy,
      target_valence: config.valence
    });
    const tracks = data.body.tracks.map(track => ({
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      image: track.album.images[0]?.url || ''
    }));
    res.json(tracks);
  } catch (err) {
    console.error('MODD PLAYLISTS ERROR:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

// test DB
app.get('/api/test', async (req, res) => {
  res.json({ message: 'Backend is running!' });
  try {
    const user = new User({ username: 'testuser' + Date.now(), password: 'test123' });
    await user.save();
    res.json({ message: 'User saved to DB', user });
  } catch (err) {
    res.status(500).json({ error: 'DB test failed', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
