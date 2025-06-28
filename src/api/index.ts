import express from 'express';

import emojis from './routes/emojis';
import recipes from './routes/recipes';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏',
  });
});

router.use('/emojis', emojis);
router.use('/recipes', recipes);

export default router;
