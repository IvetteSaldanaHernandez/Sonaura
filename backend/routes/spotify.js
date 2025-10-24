const express = require('express');
const axios = require('axios');
const router = express.Router();
const qs = require('querystring');  // For URL encoding

// Endpoint to get auth URL (call from frontend)
router.get('/auth', (req, res) => {
  const scope = 'user-read-private user-read-email playlist-read-private';  // Add scopes as needed
  const authUrl = `https://accounts.spotify.com/authorize?${qs.stringify({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    state: 'random_state_string'  // For security
  })}`;
  res.json({ authUrl });
});

// Callback endpoint (frontend sends code here after redirect)
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', qs.stringify({
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      grant_type: 'authorization_code'
    }), {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const { access_token, refresh_token } = response.data;
    // Save to user in DB (e.g., find user by session and update)
    res.json({ access_token, refresh_token });
  } catch (err) {
    res.status(500).json({ error: 'Auth failed' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', qs.stringify({
      grant_type: 'refresh_token',
      refresh_token
    }), {
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Refresh failed' });
  }
});

router.post('/recommend', async (req, res) => {
  const { access_token, mood, activity } = req.body;  // e.g., mood: 'focus', activity: 'high workload'
  try {
    // Map user input to Spotify params (e.g., seed_genres, target_energy)
    const params = {
      seed_genres: 'study,chill',  // Customize based on input
      limit: 10,
      target_energy: activity === 'high workload' ? 0.7 : 0.4  // Example mapping
    };
    const response = await axios.get(`https://api.spotify.com/v1/recommendations?${qs.stringify(params)}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Recommendation failed' });
  }
});

module.exports = router;