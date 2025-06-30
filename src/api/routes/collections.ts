import express from 'express';
import {
  createCollection,
  getUserCollections,
  getCollectionRecipes,
  updateCollection,
  deleteCollection,
  addRecipeToDefaultCollection,
  removeRecipeFromDefaultCollection,
  addRecipeToChangedCollection,
  getChangedCollectionRecipes,
  ensureDefaultCollections,
} from '../handlers/collections';

const router = express.Router();

// Rutas para colecciones
router.post('/:userId', createCollection);                           // Crear nueva colección
router.get('/:userId', getUserCollections);                          // Obtener todas las colecciones del usuario

// Ruta para crear colecciones por defecto (debe ir antes de las rutas que usan :collectionId)
router.post('/:userId/default', async (req, res) => {
  try {
    const userId = req.params.userId;
    const collections = await ensureDefaultCollections(userId);
    res.json({
      success: true,
      data: collections,
      message: 'Colecciones por defecto creadas exitosamente',
    });
  } catch (error) {
    console.error('Error creating default collections:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

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