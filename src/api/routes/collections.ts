import express from 'express';
import {
  createCollection,
  getCollectionsByUser,
  getCollectionRecipes,
  updateCollection,
  deleteCollection,
  addRecipeToDefaultCollection,
  removeRecipeFromDefaultCollection,
  addRecipeToChangedCollection,
  getChangedCollectionRecipes,
  getCollectionsWithDefaultsAndCounts,
} from '../handlers/collections';

const router = express.Router();

// Rutas para colecciones
router.post('/:userId', createCollection);                           // Crear nueva colección
router.get('/:userId', getCollectionsByUser);                          // Obtener todas las colecciones del usuario

// Ruta para crear colecciones por defecto (debe ir antes de las rutas que usan :collectionId)
router.get('/:userId/defaults', getCollectionsWithDefaultsAndCounts);

router.get('/:userId/:collectionId', getCollectionRecipes);          // Obtener recetas de una colección específica
router.put('/:userId/:collectionId', updateCollection);              // Actualizar una colección
router.delete('/:userId/:collectionId', deleteCollection);           // Eliminar una colección

// Rutas para colección por defecto (Favoritos)
router.post('/:userId/default/recipes', addRecipeToDefaultCollection);       // Agregar receta a favoritos
router.delete('/:userId/default/recipes', removeRecipeFromDefaultCollection); // Remover receta de favoritos

// Rutas para colección "Changed" (Recetas modificadas)
router.post('/:userId/changed/recipes', addRecipeToChangedCollection);       // Agregar receta a Changed
router.get('/:userId/changed/recipes', getChangedCollectionRecipes);         // Obtener recetas de Changed

export default router; 