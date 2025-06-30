# Gloo API

**API completa para la aplicación de recetas Gloo** - Una plataforma social para compartir y descubrir recetas culinarias.

## 🍳 Descripción del Proyecto

Gloo API es una API REST completa construida con Express.js y TypeScript que proporciona todas las funcionalidades necesarias para una aplicación social de recetas de cocina. Los usuarios pueden crear, compartir y descubrir recetas, seguir a otros cocineros, crear colecciones personalizadas y interactuar a través de likes y comentarios.

## ✨ Características Principales

### 🧑‍🍳 Gestión de Usuarios
- Autenticación y autorización con Clerk
- Perfiles de usuario personalizables
- Sistema de seguimiento entre usuarios
- Gestión de notificaciones

### 📝 Recetas
- CRUD completo de recetas
- Gestión de ingredientes e instrucciones paso a paso
- Subida de imágenes y videos (Supabase Storage)
- Sistema de categorización
- Calificaciones y reviews

### 🤝 Interacciones Sociales
- Sistema de likes en recetas
- Comentarios en recetas
- Seguimiento de usuarios
- Favoritos personales
- Colecciones de recetas organizadas

### 🔍 Búsqueda y Descubrimiento
- Búsqueda avanzada por texto, categorías e ingredientes
- Historial de búsquedas
- Sugerencias de búsqueda
- Recetas tendencia
- Filtros por tiempo, porciones y dificultad

### 🔔 Sistema de Notificaciones
- Notificaciones de nuevos seguidores
- Alertas de likes y comentarios
- Notificaciones de nuevas recetas de usuarios seguidos

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipado estático
- **Drizzle ORM** - ORM para base de datos
- **PostgreSQL** - Base de datos relacional

### Servicios Externos
- **Clerk** - Autenticación y gestión de usuarios
- **Supabase Storage** - Almacenamiento de archivos multimedia
- **Railway** - Deployment y hosting

### Herramientas de Desarrollo
- **Swagger/OpenAPI** - Documentación de API
- **Jest** - Testing framework
- **ESLint** - Linting de código
- **Nodemon** - Desarrollo con hot reload

## 📋 Prerrequisitos

- Node.js (v18 o superior)
- PostgreSQL
- Cuenta de Clerk
- Cuenta de Supabase
- npm o yarn

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/gloo-api.git
cd gloo-api
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crear un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/gloo_db

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=tu_clerk_publishable_key
CLERK_SECRET_KEY=tu_clerk_secret_key

# Supabase
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# Puerto del servidor
PORT=5000
```

### 4. Configurar la base de datos
```bash
# Ejecutar migraciones
npm run db:push

# Opcional: Seed con datos de prueba
npm run db:seed
```

## 🎯 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor con hot reload
npm run start:dev        # Iniciar con ts-node

# Producción
npm run build           # Compilar TypeScript
npm run start          # Iniciar servidor compilado

# Base de datos
npm run db:push        # Aplicar cambios de schema
npm run db:studio      # Abrir Drizzle Studio

# Testing y calidad
npm run test           # Ejecutar tests
npm run lint           # Linting del código
npm run typecheck      # Verificar tipos TypeScript
```

## 📚 Documentación de la API

La documentación completa de la API está disponible a través de Swagger UI:

- **Desarrollo**: `http://localhost:5000/api-docs`
- **Producción**: `https://gloo-api-production.up.railway.app/api-docs`

### URLs Base
- **API Base (Desarrollo)**: `http://localhost:5000/api/v1`
- **API Base (Producción)**: `https://gloo-api-production.up.railway.app/api/v1`

### Endpoints Principales

#### 🧑‍🍳 Usuarios
- `GET /api/v1/users` - Obtener todos los usuarios
- `GET /api/v1/users/:id` - Obtener usuario específico
- `PUT /api/v1/users/:id` - Actualizar perfil
- `GET /api/v1/users/:id/recipes` - Recetas del usuario

#### 📝 Recetas
- `GET /api/v1/recipes` - Obtener todas las recetas
- `POST /api/v1/recipes/:userId` - Crear nueva receta
- `GET /api/v1/recipes/:id` - Obtener receta específica
- `PUT /api/v1/recipes/:id` - Actualizar receta
- `DELETE /api/v1/recipes/:id` - Eliminar receta
- `GET /api/v1/recipes/trending` - Recetas tendencia

#### 🤝 Interacciones
- `POST /api/v1/likes` - Dar like a una receta
- `DELETE /api/v1/likes/:id` - Quitar like
- `POST /api/v1/comments` - Comentar receta
- `GET /api/v1/comments/recipe/:recipeId` - Obtener comentarios
- `POST /api/v1/follows` - Seguir usuario
- `DELETE /api/v1/follows/:id` - Dejar de seguir

#### 📂 Colecciones
- `GET /api/v1/collections/user/:userId` - Colecciones del usuario
- `POST /api/v1/collections` - Crear colección
- `POST /api/v1/collections/:id/recipes` - Añadir receta a colección

#### 🔍 Búsqueda
- `GET /api/v1/search` - Búsqueda general
- `GET /api/v1/search/suggestions` - Sugerencias de búsqueda
- `GET /api/v1/search/history/:userId` - Historial de búsquedas

## 🗄️ Modelo de Base de Datos

### Tablas Principales
- **users** - Perfiles de usuario
- **recipe** - Recetas principales
- **ingredients** - Ingredientes de recetas
- **instructions** - Instrucciones paso a paso
- **recipe_likes** - Likes en recetas
- **recipe_comments** - Comentarios
- **follows** - Relaciones de seguimiento
- **collections** - Colecciones de recetas
- **favorites** - Recetas favoritas
- **notifications** - Sistema de notificaciones
- **categories** - Categorías de recetas
- **search_history** - Historial de búsquedas

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm run test

# Tests con watch mode
npm run test:watch

# Coverage de tests
npm run test:coverage
```

## 🚀 Deployment

### Estado Actual
La API está actualmente desplegada y funcionando en Railway:

- **URL de Producción**: https://gloo-api-production.up.railway.app
- **Documentación API**: https://gloo-api-production.up.railway.app/api-docs
- **URL Privada Railway**: gloo-api.railway.internal
- **Puerto**: 5000

### Deployment en Railway

El proyecto está configurado para desplegarse automáticamente en Railway:

1. **Conexión del Repositorio**
   - El repositorio está conectado a Railway
   - Los deploys se ejecutan automáticamente en cada push a `main`

2. **Configuración**
   - Railway detecta automáticamente la configuración desde `railway.json`
   - Variables de entorno configuradas en el dashboard de Railway
   - Base de datos PostgreSQL proporcionada por Railway

3. **Variables de Entorno Requeridas**
   ```env
   DATABASE_URL=postgresql://[railway-generated]
   CLERK_PUBLISHABLE_KEY=tu_clerk_publishable_key
   CLERK_SECRET_KEY=tu_clerk_secret_key
   SUPABASE_URL=tu_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
   PORT=5000
   ```

### Deployment Manual (Alternativo)
```bash
# Compilar el proyecto
npm run build

# Iniciar en producción
npm start
```

### Monitoreo
- **Logs**: Disponibles en el dashboard de Railway
- **Métricas**: CPU, memoria y tráfico monitoreados por Railway
- **Health Check**: El endpoint `/` está disponible para verificar el estado

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Team Gloo

Para soporte o consultas, contacta con el equipo en: contact@gloo.com

---

⭐ **¡Dale una estrella al repo si te gusta el proyecto!** ⭐
