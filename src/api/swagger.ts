import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gloo API',
      version: '1.2.0',
      description: 'API completa para la aplicación de recetas Gloo - Una plataforma social para compartir y descubrir recetas culinarias. Incluye gestión de recetas, usuarios, ingredientes, comentarios, likes, seguimientos, favoritos, colecciones, notificaciones y búsqueda avanzada.',
      contact: {
        name: 'Gloo Team',
        email: 'contact@gloo.com',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token de autenticación JWT de Clerk',
        },
      },
      schemas: {
        // Esquemas principales
        Recipe: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único de la receta' },
            userId: { type: 'string', description: 'ID del usuario creador' },
            title: { type: 'string', description: 'Título de la receta' },
            description: { type: 'string', description: 'Descripción de la receta' },
            estimatedTime: { type: 'integer', description: 'Tiempo estimado en minutos' },
            servings: { type: 'integer', description: 'Número de porciones' },
            image: { type: 'string', description: 'URL de la imagen' },
            mediaType: { type: 'string', description: 'Tipo de media (image, video)' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            externalId: { type: 'string', description: 'ID externo del usuario (Clerk)' },
            description: { type: 'string', description: 'Descripción del perfil' },
            idSocialMedia: { type: 'string', description: 'ID de redes sociales' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedBy: { type: 'string' },
          },
        },
        Ingredient: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único del ingrediente' },
            recipeId: { type: 'integer', description: 'ID de la receta asociada' },
            name: { type: 'string', description: 'Nombre del ingrediente' },
            quantity: { type: 'integer', description: 'Cantidad' },
            unit: { type: 'string', description: 'Unidad de medida' },
            description: { type: 'string', description: 'Descripción adicional' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Instruction: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único de la instrucción' },
            recipeId: { type: 'integer', description: 'ID de la receta asociada' },
            step: { type: 'integer', description: 'Número del paso' },
            description: { type: 'string', description: 'Descripción del paso' },
            image: { type: 'string', description: 'URL de imagen del paso (opcional)' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Collection: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único de la colección' },
            userId: { type: 'string', description: 'ID del usuario propietario' },
            name: { type: 'string', description: 'Nombre de la colección' },
            description: { type: 'string', description: 'Descripción de la colección' },
            icon: { type: 'string', description: 'Ícono de la colección' },
            color: { type: 'string', description: 'Color de la colección' },
            isPublic: { type: 'string', enum: ['true', 'false'], description: 'Si es pública' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único del comentario' },
            recipeId: { type: 'integer', description: 'ID de la receta comentada' },
            userId: { type: 'string', description: 'ID del usuario que comenta' },
            content: { type: 'string', description: 'Contenido del comentario' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Like: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único del like' },
            recipeId: { type: 'integer', description: 'ID de la receta' },
            userId: { type: 'string', description: 'ID del usuario' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Follow: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único del seguimiento' },
            followerId: { type: 'string', description: 'ID del usuario que sigue' },
            followingId: { type: 'string', description: 'ID del usuario seguido' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Favorite: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único del favorito' },
            userId: { type: 'string', description: 'ID del usuario' },
            recipeId: { type: 'integer', description: 'ID de la receta' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único de la notificación' },
            recipientId: { type: 'string', description: 'ID del destinatario' },
            senderId: { type: 'string', description: 'ID del remitente' },
            type: { type: 'string', description: 'Tipo de notificación' },
            title: { type: 'string', description: 'Título' },
            message: { type: 'string', description: 'Mensaje' },
            relatedId: { type: 'integer', description: 'ID relacionado' },
            relatedType: { type: 'string', description: 'Tipo relacionado' },
            read: { type: 'string', enum: ['true', 'false'], description: 'Estado de lectura' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único de la categoría' },
            name: { type: 'string', description: 'Nombre interno' },
            displayName: { type: 'string', description: 'Nombre visible' },
            icon: { type: 'string', description: 'Ícono' },
            color: { type: 'string', description: 'Color' },
            isActive: { type: 'string', enum: ['true', 'false'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SearchHistory: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID único del historial' },
            userId: { type: 'string', description: 'ID del usuario' },
            query: { type: 'string', description: 'Consulta de búsqueda' },
            resultsCount: { type: 'integer', description: 'Número de resultados' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Mensaje de error' },
            stack: { type: 'string', description: 'Stack trace (solo desarrollo)' },
          },
        },
        MessageResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Mensaje de respuesta' },
          },
        },
        // Esquemas de request body
        CreateRecipeRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', description: 'Título de la receta' },
            description: { type: 'string', description: 'Descripción' },
            estimatedTime: { type: 'integer', description: 'Tiempo estimado en minutos' },
            servings: { type: 'integer', description: 'Número de porciones' },
            image: { type: 'string', description: 'URL de imagen' },
            mediaType: { type: 'string', description: 'Tipo de media' },
          },
        },
        CreateIngredientRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', description: 'Nombre del ingrediente' },
            quantity: { type: 'integer', description: 'Cantidad' },
            unit: { type: 'string', description: 'Unidad de medida' },
            description: { type: 'string', description: 'Descripción adicional' },
          },
        },
        CreateInstructionRequest: {
          type: 'object',
          required: ['step', 'description'],
          properties: {
            step: { type: 'integer', description: 'Número del paso' },
            description: { type: 'string', description: 'Descripción del paso' },
            image: { type: 'string', description: 'URL de imagen (opcional)' },
          },
        },
        CreateCollectionRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', description: 'Nombre de la colección' },
            description: { type: 'string', description: 'Descripción' },
            icon: { type: 'string', description: 'Ícono' },
            color: { type: 'string', description: 'Color' },
            isPublic: { type: 'string', enum: ['true', 'false'], description: 'Si es pública' },
          },
        },
        CreateCommentRequest: {
          type: 'object',
          required: ['recipeId', 'content'],
          properties: {
            recipeId: { type: 'integer', description: 'ID de la receta' },
            content: { type: 'string', description: 'Contenido del comentario' },
          },
        },
      },
    },
    tags: [
      { name: 'General', description: 'Endpoints generales de la API' },
      { name: 'Recipes', description: 'Gestión de recetas' },
      { name: 'Users', description: 'Gestión de usuarios' },
      { name: 'Ingredients', description: 'Gestión de ingredientes' },
      { name: 'Instructions', description: 'Gestión de instrucciones' },
      { name: 'Collections', description: 'Gestión de colecciones' },
      { name: 'Comments', description: 'Gestión de comentarios' },
      { name: 'Likes', description: 'Gestión de likes' },
      { name: 'Follows', description: 'Gestión de seguimientos' },
      { name: 'Favorites', description: 'Gestión de favoritos' },
      { name: 'Notifications', description: 'Gestión de notificaciones' },
      { name: 'Search', description: 'Búsqueda y categorías' },
    ],
    paths: {
      // ========== GENERAL ==========
      '/': {
        get: {
          tags: ['General'],
          summary: 'Endpoint raíz de la API',
          description: 'Retorna información básica de la API y estado',
          responses: {
            200: {
              description: 'Información de la API',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'API - 👋🌎🌍🌏' },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ========== RECIPES ==========
      '/recipes': {
        get: {
          tags: ['Recipes'],
          summary: 'Obtener todas las recetas',
          description: 'Obtiene una lista paginada de todas las recetas disponibles',
          responses: {
            200: {
              description: 'Lista de recetas obtenida exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Recipe' },
                  },
                },
              },
            },
            500: { $ref: '#/components/responses/ServerError' },
          },
        },
      },
      '/recipes/user/{userId}': {
        get: {
          tags: ['Recipes'],
          summary: 'Obtener recetas por usuario',
          description: 'Obtiene todas las recetas creadas por un usuario específico',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Recetas del usuario obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Recipe' },
                  },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/recipes/{userId}': {
        post: {
          tags: ['Recipes'],
          summary: 'Crear nueva receta',
          description: 'Crea una nueva receta para el usuario especificado',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario creador',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateRecipeRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Receta creada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Recipe' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/recipes/{id}': {
        put: {
          tags: ['Recipes'],
          summary: 'Actualizar receta',
          description: 'Actualiza una receta existente',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID de la receta',
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateRecipeRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Receta actualizada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Recipe' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
        delete: {
          tags: ['Recipes'],
          summary: 'Eliminar receta',
          description: 'Elimina una receta existente',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID de la receta',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Receta eliminada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },

      // ========== USERS ==========
      '/users/{userId}': {
        get: {
          tags: ['Users'],
          summary: 'Obtener datos del usuario',
          description: 'Obtiene los datos completos de un usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Datos del usuario obtenidos exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Users'],
          summary: 'Actualizar usuario',
          description: 'Actualiza los datos del usuario tanto en Clerk como en la tabla users',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    description: { type: 'string', description: 'Descripción del perfil' },
                    idSocialMedia: { type: 'string', description: 'ID de redes sociales' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Usuario actualizado exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },

      // ========== INGREDIENTS ==========
      '/ingredients/{recipeId}': {
        post: {
          tags: ['Ingredients'],
          summary: 'Crear ingrediente',
          description: 'Crea un nuevo ingrediente para una receta',
          parameters: [
            {
              name: 'recipeId',
              in: 'path',
              required: true,
              description: 'ID de la receta',
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateIngredientRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Ingrediente creado exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Ingredient' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/ingredients/{id}': {
        put: {
          tags: ['Ingredients'],
          summary: 'Actualizar ingrediente',
          description: 'Actualiza un ingrediente existente',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID del ingrediente',
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateIngredientRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Ingrediente actualizado exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Ingredient' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
        delete: {
          tags: ['Ingredients'],
          summary: 'Eliminar ingrediente',
          description: 'Elimina un ingrediente existente',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID del ingrediente',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Ingrediente eliminado exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },

      // ========== INSTRUCTIONS ==========
      '/instructions/{recipeId}': {
        post: {
          tags: ['Instructions'],
          summary: 'Crear instrucción',
          description: 'Crea una nueva instrucción para una receta',
          parameters: [
            {
              name: 'recipeId',
              in: 'path',
              required: true,
              description: 'ID de la receta',
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateInstructionRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Instrucción creada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Instruction' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/instructions/{id}': {
        put: {
          tags: ['Instructions'],
          summary: 'Actualizar instrucción',
          description: 'Actualiza una instrucción existente',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID de la instrucción',
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateInstructionRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Instrucción actualizada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Instruction' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
        delete: {
          tags: ['Instructions'],
          summary: 'Eliminar instrucción',
          description: 'Elimina una instrucción existente',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID de la instrucción',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Instrucción eliminada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },

      // ========== SEARCH ==========
      '/search': {
        get: {
          tags: ['Search'],
          summary: 'Buscar recetas',
          description: 'Busca recetas con filtros y opciones de ordenamiento',
          parameters: [
            {
              name: 'query',
              in: 'query',
              description: 'Término de búsqueda',
              schema: { type: 'string' },
            },
            {
              name: 'categoryId',
              in: 'query',
              description: 'ID de categoría para filtrar',
              schema: { type: 'integer' },
            },
            {
              name: 'page',
              in: 'query',
              description: 'Número de página',
              schema: { type: 'integer', default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Límite de resultados por página',
              schema: { type: 'integer', default: 20 },
            },
            {
              name: 'sortBy',
              in: 'query',
              description: 'Criterio de ordenamiento',
              schema: { type: 'string', enum: ['relevance', 'date', 'popularity'], default: 'relevance' },
            },
          ],
          responses: {
            200: {
              description: 'Resultados de búsqueda obtenidos exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      recipes: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Recipe' },
                      },
                      total: { type: 'integer', description: 'Total de resultados' },
                      page: { type: 'integer', description: 'Página actual' },
                      limit: { type: 'integer', description: 'Límite por página' },
                      totalPages: { type: 'integer', description: 'Total de páginas' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/search/suggestions': {
        get: {
          tags: ['Search'],
          summary: 'Obtener sugerencias de búsqueda',
          description: 'Obtiene sugerencias populares para búsquedas',
          responses: {
            200: {
              description: 'Sugerencias obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        query: { type: 'string' },
                        popularity: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/search/categories': {
        get: {
          tags: ['Search'],
          summary: 'Obtener categorías',
          description: 'Obtiene todas las categorías disponibles',
          responses: {
            200: {
              description: 'Categorías obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Category' },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Search'],
          summary: 'Crear categoría (Admin)',
          description: 'Crea una nueva categoría (solo administradores)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'displayName'],
                  properties: {
                    name: { type: 'string' },
                    displayName: { type: 'string' },
                    icon: { type: 'string' },
                    color: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Categoría creada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Category' },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/search/history/{userId}': {
        get: {
          tags: ['Search'],
          summary: 'Obtener historial de búsquedas',
          description: 'Obtiene el historial de búsquedas del usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Historial obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/SearchHistory' },
                  },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
        post: {
          tags: ['Search'],
          summary: 'Agregar al historial',
          description: 'Agrega una búsqueda al historial del usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    resultsCount: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Búsqueda agregada al historial',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchHistory' },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
        delete: {
          tags: ['Search'],
          summary: 'Limpiar historial',
          description: 'Elimina todo el historial de búsquedas del usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Historial limpiado exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
      },

      // ========== LIKES ==========
      '/likes/{userId}/like': {
        post: {
          tags: ['Likes'],
          summary: 'Dar like a una receta',
          description: 'Permite a un usuario dar like a una receta',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipeId'],
                  properties: {
                    recipeId: { type: 'integer', description: 'ID de la receta' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Like agregado exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Like' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/likes/{userId}/unlike': {
        delete: {
          tags: ['Likes'],
          summary: 'Quitar like de una receta',
          description: 'Permite a un usuario quitar el like de una receta',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipeId'],
                  properties: {
                    recipeId: { type: 'integer', description: 'ID de la receta' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Like eliminado exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/likes/recipe/{recipeId}': {
        get: {
          tags: ['Likes'],
          summary: 'Obtener likes de una receta',
          description: 'Obtiene todos los likes de una receta específica',
          parameters: [
            {
              name: 'recipeId',
              in: 'path',
              required: true,
              description: 'ID de la receta',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Likes obtenidos exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Like' },
                  },
                },
              },
            },
          },
        },
      },
      '/likes/{userId}/status/{recipeId}': {
        get: {
          tags: ['Likes'],
          summary: 'Verificar estado de like',
          description: 'Verifica si el usuario ha dado like a una receta',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'recipeId',
              in: 'path',
              required: true,
              description: 'ID de la receta',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Estado de like obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      liked: { type: 'boolean', description: 'Si el usuario ha dado like' },
                      likeId: { type: 'integer', description: 'ID del like si existe' },
                    },
                  },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
      },

      // ========== FOLLOWS ==========
      '/follows/{userId}/follow': {
        post: {
          tags: ['Follows'],
          summary: 'Seguir a un usuario',
          description: 'Permite seguir a otro usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario que sigue',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['followingId'],
                  properties: {
                    followingId: { type: 'string', description: 'ID del usuario a seguir' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Usuario seguido exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Follow' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/follows/{userId}/unfollow': {
        delete: {
          tags: ['Follows'],
          summary: 'Dejar de seguir a un usuario',
          description: 'Permite dejar de seguir a otro usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario que deja de seguir',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['followingId'],
                  properties: {
                    followingId: { type: 'string', description: 'ID del usuario a dejar de seguir' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Usuario no seguido exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/follows/{userId}/followers': {
        get: {
          tags: ['Follows'],
          summary: 'Obtener seguidores',
          description: 'Obtiene la lista de seguidores de un usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Seguidores obtenidos exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Follow' },
                  },
                },
              },
            },
          },
        },
      },
      '/follows/{userId}/following': {
        get: {
          tags: ['Follows'],
          summary: 'Obtener usuarios seguidos',
          description: 'Obtiene la lista de usuarios que sigue un usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Usuarios seguidos obtenidos exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Follow' },
                  },
                },
              },
            },
          },
        },
      },
      '/follows/{userId}/status': {
        get: {
          tags: ['Follows'],
          summary: 'Obtener estado de seguimiento',
          description: 'Verifica el estado de seguimiento entre dos usuarios',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'targetUserId',
              in: 'query',
              required: true,
              description: 'ID del usuario objetivo',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Estado de seguimiento obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      isFollowing: { type: 'boolean', description: 'Si está siguiendo' },
                      isFollowed: { type: 'boolean', description: 'Si es seguido' },
                    },
                  },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/follows/{userId}/stats': {
        get: {
          tags: ['Follows'],
          summary: 'Obtener estadísticas de seguimiento',
          description: 'Obtiene contadores de seguidores y seguidos',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Estadísticas obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      followersCount: { type: 'integer', description: 'Número de seguidores' },
                      followingCount: { type: 'integer', description: 'Número de seguidos' },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ========== FAVORITES ==========
      '/favorites/{userId}': {
        post: {
          tags: ['Favorites'],
          summary: 'Agregar a favoritos',
          description: 'Agrega una receta a la lista de favoritos del usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipeId'],
                  properties: {
                    recipeId: { type: 'integer', description: 'ID de la receta' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Receta agregada a favoritos exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Favorite' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
        get: {
          tags: ['Favorites'],
          summary: 'Obtener recetas favoritas',
          description: 'Obtiene todas las recetas favoritas del usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Favoritos obtenidos exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Favorite' },
                  },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
        delete: {
          tags: ['Favorites'],
          summary: 'Eliminar de favoritos',
          description: 'Elimina una receta de la lista de favoritos',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipeId'],
                  properties: {
                    recipeId: { type: 'integer', description: 'ID de la receta' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Receta eliminada de favoritos exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/favorites/{userId}/check/{recipeId}': {
        get: {
          tags: ['Favorites'],
          summary: 'Verificar si está en favoritos',
          description: 'Verifica si una receta está en la lista de favoritos del usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'recipeId',
              in: 'path',
              required: true,
              description: 'ID de la receta',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Estado de favorito verificado exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      isFavorite: { type: 'boolean', description: 'Si está en favoritos' },
                      favoriteId: { type: 'integer', description: 'ID del favorito si existe' },
                    },
                  },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/favorites/{userId}/stats': {
        get: {
          tags: ['Favorites'],
          summary: 'Obtener estadísticas de favoritos',
          description: 'Obtiene estadísticas de los favoritos del usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Estadísticas obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalFavorites: { type: 'integer', description: 'Total de favoritos' },
                      favoritesByCategory: { type: 'object', description: 'Favoritos por categoría' },
                    },
                  },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/favorites/{userId}/collections': {
        post: {
          tags: ['Favorites'],
          summary: 'Crear colección desde favoritos',
          description: 'Crea una nueva colección usando recetas favoritas seleccionadas',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'favoriteIds'],
                  properties: {
                    name: { type: 'string', description: 'Nombre de la colección' },
                    description: { type: 'string', description: 'Descripción de la colección' },
                    favoriteIds: { 
                      type: 'array', 
                      items: { type: 'integer' }, 
                      description: 'IDs de favoritos a incluir',
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Colección creada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Collection' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
      },

      // ========== COLLECTIONS ==========
      '/collections/{userId}': {
        post: {
          tags: ['Collections'],
          summary: 'Crear colección',
          description: 'Crea una nueva colección para el usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateCollectionRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Colección creada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Collection' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
        get: {
          tags: ['Collections'],
          summary: 'Obtener colecciones del usuario',
          description: 'Obtiene todas las colecciones del usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Colecciones obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Collection' },
                  },
                },
              },
            },
          },
        },
      },
      '/collections/{userId}/{collectionId}': {
        get: {
          tags: ['Collections'],
          summary: 'Obtener recetas de una colección',
          description: 'Obtiene todas las recetas de una colección específica',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'collectionId',
              in: 'path',
              required: true,
              description: 'ID de la colección',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Recetas de la colección obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      collection: { $ref: '#/components/schemas/Collection' },
                      recipes: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Recipe' },
                      },
                    },
                  },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Collections'],
          summary: 'Actualizar colección',
          description: 'Actualiza una colección existente',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'collectionId',
              in: 'path',
              required: true,
              description: 'ID de la colección',
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateCollectionRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Colección actualizada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Collection' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
        delete: {
          tags: ['Collections'],
          summary: 'Eliminar colección',
          description: 'Elimina una colección existente',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'collectionId',
              in: 'path',
              required: true,
              description: 'ID de la colección',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Colección eliminada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/collections/{userId}/{collectionId}/recipes': {
        post: {
          tags: ['Collections'],
          summary: 'Agregar receta a colección',
          description: 'Agrega una receta a una colección existente',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'collectionId',
              in: 'path',
              required: true,
              description: 'ID de la colección',
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipeId'],
                  properties: {
                    recipeId: { type: 'integer', description: 'ID de la receta' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Receta agregada a la colección exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
        delete: {
          tags: ['Collections'],
          summary: 'Eliminar receta de colección',
          description: 'Elimina una receta de una colección',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'collectionId',
              in: 'path',
              required: true,
              description: 'ID de la colección',
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipeId'],
                  properties: {
                    recipeId: { type: 'integer', description: 'ID de la receta' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Receta eliminada de la colección exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },

      // ========== COMMENTS ==========
      '/comments/{userId}': {
        post: {
          tags: ['Comments'],
          summary: 'Crear comentario',
          description: 'Crea un nuevo comentario en una receta',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateCommentRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Comentario creado exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Comment' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/comments/recipe/{recipeId}': {
        get: {
          tags: ['Comments'],
          summary: 'Obtener comentarios de una receta',
          description: 'Obtiene todos los comentarios de una receta específica',
          parameters: [
            {
              name: 'recipeId',
              in: 'path',
              required: true,
              description: 'ID de la receta',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Comentarios obtenidos exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Comment' },
                  },
                },
              },
            },
          },
        },
      },
      '/comments/{userId}/{commentId}': {
        put: {
          tags: ['Comments'],
          summary: 'Actualizar comentario',
          description: 'Actualiza un comentario existente',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'commentId',
              in: 'path',
              required: true,
              description: 'ID del comentario',
              schema: { type: 'integer' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    content: { type: 'string', description: 'Nuevo contenido del comentario' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Comentario actualizado exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Comment' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
        delete: {
          tags: ['Comments'],
          summary: 'Eliminar comentario',
          description: 'Elimina un comentario existente',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'commentId',
              in: 'path',
              required: true,
              description: 'ID del comentario',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Comentario eliminado exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },

      // ========== NOTIFICATIONS ==========
      '/notifications/{userId}': {
        get: {
          tags: ['Notifications'],
          summary: 'Obtener notificaciones',
          description: 'Obtiene todas las notificaciones del usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Notificaciones obtenidas exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Notification' },
                  },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/notifications/{userId}/read': {
        put: {
          tags: ['Notifications'],
          summary: 'Marcar notificaciones como leídas',
          description: 'Marca notificaciones específicas como leídas',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['notificationIds'],
                  properties: {
                    notificationIds: {
                      type: 'array',
                      items: { type: 'integer' },
                      description: 'IDs de las notificaciones a marcar como leídas',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Notificaciones marcadas como leídas exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/notifications/{userId}/read-all': {
        put: {
          tags: ['Notifications'],
          summary: 'Marcar todas las notificaciones como leídas',
          description: 'Marca todas las notificaciones del usuario como leídas',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Todas las notificaciones marcadas como leídas exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/notifications': {
        post: {
          tags: ['Notifications'],
          summary: 'Crear notificación (Admin)',
          description: 'Crea una nueva notificación (uso interno/administrativo)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipientId', 'type', 'title', 'message'],
                  properties: {
                    recipientId: { type: 'string', description: 'ID del destinatario' },
                    senderId: { type: 'string', description: 'ID del remitente' },
                    type: { type: 'string', description: 'Tipo de notificación' },
                    title: { type: 'string', description: 'Título de la notificación' },
                    message: { type: 'string', description: 'Mensaje de la notificación' },
                    relatedId: { type: 'integer', description: 'ID relacionado' },
                    relatedType: { type: 'string', description: 'Tipo relacionado' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Notificación creada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Notification' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/notifications/{userId}/{notificationId}': {
        delete: {
          tags: ['Notifications'],
          summary: 'Eliminar notificación',
          description: 'Elimina una notificación específica',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
            {
              name: 'notificationId',
              in: 'path',
              required: true,
              description: 'ID de la notificación',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'Notificación eliminada exitosamente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MessageResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
          security: [{ BearerAuth: [] }],
        },
      },
      '/notifications/{userId}/unread-count': {
        get: {
          tags: ['Notifications'],
          summary: 'Obtener contador de notificaciones no leídas',
          description: 'Obtiene el número de notificaciones no leídas del usuario',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              description: 'ID del usuario',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Contador obtenido exitosamente',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      unreadCount: { type: 'integer', description: 'Número de notificaciones no leídas' },
                    },
                  },
                },
              },
            },
          },
          security: [{ BearerAuth: [] }],
        },
      },
    },
    // Respuestas reutilizables
    responses: {
      BadRequest: {
        description: 'Solicitud incorrecta',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      NotFound: {
        description: 'Recurso no encontrado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      ServerError: {
        description: 'Error interno del servidor',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
  apis: ['./src/api/routes/*.ts'],
};

const specs = swaggerJsdoc(options);
export default specs; 