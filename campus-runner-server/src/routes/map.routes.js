import express from 'express';

import { getRouteSummary, searchPlaces, reverseGeocode } from '../services/map.service.js';

const router = express.Router();

router.get('/map/suggestions', async (req, res, next) => {
  try {
    const location = req.query.latitude && req.query.longitude
      ? { latitude: Number(req.query.latitude), longitude: Number(req.query.longitude) }
      : null;

    const data = await searchPlaces({
      keyword: req.query.keyword || '',
      campus: req.query.campus || '东方红校区',
      location,
      limit: req.query.limit || 6
    });

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/map/route', async (req, res, next) => {
  try {
    const data = await getRouteSummary({
      from: req.body?.from,
      to: req.body?.to
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/map/reverse', async (req, res, next) => {
  try {
    const data = await reverseGeocode({
      location: req.body?.location,
      campus: req.body?.campus || '东方红校区'
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export default router;
