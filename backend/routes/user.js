const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST feedback
router.post('/feedback', async (req, res) => {
  const { userId, playlistId, rating, context } = req.body;
  try {
    const newFeedback = new Feedback({ userId, playlistId, rating, context });
    await newFeedback.save();
    // Optionally, update user preferences based on feedback
    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(500).json({ error: 'Feedback save failed' });
  }
});

// GET user feedback (for profile page)
router.get('/feedback/:userId', async (req, res) => {
  try {
    const feedback = await Feedback.find({ userId: req.params.userId });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

router.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPw = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPw });
    await newUser.save();
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

module.exports = router;