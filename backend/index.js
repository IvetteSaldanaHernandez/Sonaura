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

// routes
// get spotify login URL
app.get('/api/spotify/login', (req, res) => {
  const scopes = ['user-read-private', 'user-read-email', 'playlist-read-private'];
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
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ access_token, refresh_token });
  } catch (err) {
    console.error('Spotify auth error:', err);
    res.status(400).json({ error: err.message });
  }
});

// get reccommendations
app.post('/api/spotify/recommend', async (req, res) => {
  const { access_token, mood = 'focus', workload = 'medium' } = req.body;
  try {
    spotifyApi.setAccessToken(access_token);
    let seed_genres = 'lofi,ambient';
    let target_energy = 0.4;
    let target_valence = 0.5;
    // change based on user input
    if (mood === 'energetic') {
      target_energy = 0.8;
      target_valence = 0.7;
      seed_genres = 'pop,upbeat';
    } else if (workload === 'high') {
      target_energy = 0.6;
      seed_genres = 'classical,focus';
    }
    const response = await spotifyApi.getRecommendations({
      seed_genres,
      limit: 10,
      target_energy,
      target_valence
    });
    res.json(response.body);
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// refresh token
app.post('/api/spotify/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  spotifyApi.setRefreshToken(refresh_token);
  try {
    const data = await spotifyApi.refreshAccessToken();
    const access_token = data.body.access_token;
    res.json({ access_token });
  } catch (err) {
    res.status(400).json({ error: err.message });
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
