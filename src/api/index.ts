import express from 'express';

import emojis from './routes/emojis';
import recipes from './routes/recipes';
import ingredients from './routes/ingredients';
import instructions from './routes/instructions';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏',
  });
});

router.use('/emojis', emojis);
router.use('/recipes', recipes);
router.use('/ingredients', ingredients);
router.use('/instructions', instructions);

export default router;
