const SpotifyWebApi = require('spotify-web-api-node');
const User = require('../models/User');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

const refreshAccessToken = async (user) => {
  try {
    if (!user.spotifyRefreshToken) {
      throw new Error('No refresh token available');
    }

    spotifyApi.setRefreshToken(user.spotifyRefreshToken);
    const data = await spotifyApi.refreshAccessToken();
    const newToken = data.body.access_token;

    // Update user with new token
    user.spotifyToken = newToken;
    await user.save();

    return newToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
};

const spotifyAuthMiddleware = async (req, res, next) => {
  try {
    if (!req.user.spotifyToken) {
      return res.status(403).json({ error: 'Spotify not connected' });
    }

    spotifyApi.setAccessToken(req.user.spotifyToken);

    // Test token validity
    try {
      await spotifyApi.getMe();
    } catch (error) {
      if (error.statusCode === 401) {
        // Token expired, refresh it
        const newToken = await refreshAccessToken(req.user);
        spotifyApi.setAccessToken(newToken);
      } else {
        throw error;
      }
    }

    req.spotifyApi = spotifyApi;
    next();
  } catch (error) {
    console.error('Spotify auth middleware error:', error);
    res.status(401).json({ error: 'Spotify authentication failed' });
  }
};

module.exports = { spotifyAuthMiddleware, refreshAccessToken };