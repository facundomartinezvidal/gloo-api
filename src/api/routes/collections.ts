import express from 'express';
import {
  createCollection,
  getUserCollections,
  getCollectionRecipes,
  addRecipeToCollection,
  removeRecipeFromCollection,
  updateCollection,
  deleteCollection,
} from '../handlers/collections';

const router = express.Router();

// Rutas para colecciones
router.post('/:userId', createCollection);                           // Crear nueva colección
router.get('/:userId', getUserCollections);                          // Obtener todas las colecciones del usuario
router.get('/:userId/:collectionId', getCollectionRecipes);          // Obtener recetas de una colección específica
router.put('/:userId/:collectionId', updateCollection);              // Actualizar una colección
router.delete('/:userId/:collectionId', deleteCollection);           // Eliminar una colección

// Rutas para manejo de recetas en colecciones
router.post('/:userId/:collectionId/recipes', addRecipeToCollection);        // Agregar receta a colección
router.delete('/:userId/:collectionId/recipes', removeRecipeFromCollection); // Eliminar receta de colección

export default router; 