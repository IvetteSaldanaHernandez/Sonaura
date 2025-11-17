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

    const refreshSpotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      refreshToken: user.spotifyRefreshToken
    });

    const data = await refreshSpotifyApi.refreshAccessToken();
    const newToken = data.body.access_token;

    // Update user with new token
    user.spotifyToken = newToken;
    // Spotify may also return a new refresh token
    if (data.body.refresh_token) {
      user.spotifyRefreshToken = data.body.refresh_token;
    }
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

    // Create a NEW instance for each request
    const userSpotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    });

    userSpotifyApi.setAccessToken(req.user.spotifyToken);

    // Test token validity
    try {
      await userSpotifyApi.getMe();
    } catch (error) {
      if (error.statusCode === 401) {
        // Token expired, refresh it
        const newToken = await refreshAccessToken(req.user);
        userSpotifyApi.setAccessToken(newToken);
      } else {
        throw error;
      }
    }

    req.spotifyApi = userSpotifyApi;
    next();
  } catch (error) {
    console.error('Spotify auth middleware error:', error);
    res.status(401).json({ error: 'Spotify authentication failed' });
  }
};

module.exports = { spotifyAuthMiddleware, refreshAccessToken };