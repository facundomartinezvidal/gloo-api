import express from 'express';
import {
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  checkIfFavorite,
  createCollectionFromFavorites,
  getFavoritesStats,
} from '../handlers/favorites';

const router = express.Router();

// Rutas para favoritos
router.post('/:userId', addToFavorites);                           // Agregar receta a favoritos
router.delete('/:userId', removeFromFavorites);                    // Eliminar receta de favoritos
router.get('/:userId', getUserFavorites);                          // Obtener todas las recetas favoritas del usuario
router.get('/:userId/check/:recipeId', checkIfFavorite);           // Verificar si una receta está en favoritos
router.get('/:userId/stats', getFavoritesStats);                   // Obtener estadísticas de favoritos

// Rutas para crear colecciones desde favoritos
router.post('/:userId/collections', createCollectionFromFavorites); // Crear colección desde favoritos seleccionados

export default router; 