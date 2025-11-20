const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios'); // Add this import
const User = require('./models/User'); // Add this import
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple test route
app.get('/api/test-spotify', async (req, res) => {
  try {
    // Test with a specific user
    const user = await User.findOne({ hasSpotify: true });
    if (!user) {
      return res.json({ error: 'No user with Spotify connection found' });
    }

    const token = user.spotifyAccessToken;
    const testResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    res.json({ 
      success: true, 
      user: testResponse.data,
      token: token.substring(0, 20) + '...'
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/spotify', require('./routes/spotify'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});