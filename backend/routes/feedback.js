const express = require('express');
const Feedback = require('../models/Feedback');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Submit feedback
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { playlistId, rating, context } = req.body;

    const feedback = new Feedback({
      userId: req.user._id,
      playlistId,
      rating,
      context
    });

    await feedback.save();
    res.status(201).json(feedback);
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get user's feedback history
router.get('/my-feedback', authMiddleware, async (req, res) => {
  try {
    const feedback = await Feedback.find({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .limit(10);

    res.json(feedback);
  } catch (error) {
    console.error('Feedback fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

module.exports = router;