const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth'); // Assuming you have this middleware

// Update user location and visibility
// POST /api/location/update
router.post('/update', authenticateToken, async (req, res) => {
  const { latitude, longitude, isVisible } = req.body;
  const userId = req.user.id;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  try {
    const updateQuery = `
      UPDATE users 
      SET latitude = $1, longitude = $2, is_visible_on_map = $3
      WHERE id = $4
      RETURNING id, username, is_visible_on_map;
    `;
    const result = await query(updateQuery, [latitude, longitude, isVisible, userId]);

    res.json({ message: 'Location updated', user: result.rows[0] });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ error: 'Server error updating location' });
  }
});

// Get nearby users
// GET /api/location/nearby?lat=X&long=Y&radius=Z
router.get('/nearby', authenticateToken, async (req, res) => {
  const { lat, long, radius = 10 } = req.query; // radius in km

  if (!lat || !long) {
    return res.status(400).json({ error: 'Current latitude (lat) and longitude (long) required' });
  }

  try {
    // Haversine formula to calculate distance
    // 6371 is Earth radius in km
    const nearbyQuery = `
      SELECT 
        id, 
        username, 
        full_name, 
        latitude, 
        longitude,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(latitude))
          )
        ) AS distance
      FROM users
      WHERE is_visible_on_map = TRUE
      AND id != $3 -- Don't show self (optional)
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(latitude))
          )
      ) < $4
      ORDER BY distance ASC
      LIMIT 50;
    `;

    const result = await query(nearbyQuery, [lat, long, req.user.id, radius]);
    res.json(result.rows);

  } catch (err) {
    console.error('Error fetching nearby users:', err);
    res.status(500).json({ error: 'Server error fetching nearby users' });
  }
});

module.exports = router;
