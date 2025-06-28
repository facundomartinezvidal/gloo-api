import express from 'express';

import emojis from './routes/emojis';
import recipes from './routes/recipes';
import search from './routes/search';
import ingredients from './routes/ingredients';
import instructions from './routes/instructions';
import follows from './routes/follows';
import likes from './routes/likes';
import comments from './routes/comments';
import notifications from './routes/notifications';
import collections from './routes/collections';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏',
  });
});

router.use('/emojis', emojis);
router.use('/recipes', recipes);
router.use('/search', search);
router.use('/ingredients', ingredients);
router.use('/instructions', instructions);
router.use('/follows', follows);
router.use('/likes', likes);
router.use('/comments', comments);
router.use('/notifications', notifications);
router.use('/collections', collections);

export default router;
