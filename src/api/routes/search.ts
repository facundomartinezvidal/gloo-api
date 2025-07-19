import express from 'express';
import {
  searchRecipes,
  searchUsers,
  getSearchSuggestions,
  getUserSearchHistory,
  addToSearchHistory,
  getCategories,
  createCategory,
  clearSearchHistory,
  removeFromSearchHistory,
  searchAll,
} from '../handlers/search';

const router = express.Router();

// Rutas principales de búsqueda
router.get('/', searchRecipes); // GET /search?query=chicken&categoryId=1&page=1&limit=20&sortBy=relevance
router.get('/users', searchUsers); // GET /search/users?query=username&page=1&limit=20
router.get('/suggestions', getSearchSuggestions); // GET /search/suggestions
router.get('/categories', getCategories); // GET /search/categories
router.get('/all', searchAll); // GET /search/all?type=users&query=...&limit=...

// Rutas de historial de búsquedas del usuario
router.get('/history/:userId', getUserSearchHistory); // GET /search/history/:userId
router.post('/history/:userId', addToSearchHistory); // POST /search/history/:userId
router.delete('/history/:userId', clearSearchHistory); // DELETE /search/history/:userId
router.delete('/history/:userId/:historyId', removeFromSearchHistory); // DELETE /search/history/:userId/:historyId

// Rutas administrativas
router.post('/categories', createCategory); // POST /search/categories

export default router; 