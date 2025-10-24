const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, 
  preferences: { type: [String], default: [] },
  spotifyId: { type: String, unique: true, sparse: true },
  spotifyToken: { type: String }, 
  spotifyRefreshToken: { type: String }, 
});

module.exports = mongoose.model('User', userSchema);