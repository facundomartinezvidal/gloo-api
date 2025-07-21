import { Request, Response, NextFunction } from 'express';
import { clerkClient, verifyToken } from '@clerk/express';

// Interfaz extendida para requests autenticados
export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
  };
  userId?: string;
  user?: any;
}

// Middleware que verifica el token JWT de Clerk
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;


    if (!bearerToken) {
      console.log('❌ Auth Debug - No bearer token found');
      return res.status(401).json({
        success: false,
        error: 'Authorization token required',
      });
    }

    // Verificar el token usando Clerk
    const tokenPayload = await verifyToken(bearerToken, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    console.log('🔍 Auth Debug - Token Payload:', {
      sub: tokenPayload?.sub,
      sid: tokenPayload?.sid,
      iss: tokenPayload?.iss,
      exp: tokenPayload?.exp,
    });

    if (!tokenPayload) {
      console.log('❌ Auth Debug - Invalid token payload');
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Agregar información de autenticación al request
    req.auth = {
      userId: tokenPayload.sub,
      sessionId: tokenPayload.sid || '',
    };
    req.userId = tokenPayload.sub;

    console.log('✅ Auth Debug - User authenticated:', tokenPayload.sub);
    next();
  } catch (error) {
    console.error('❌ Auth Debug - Error in auth middleware:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

// Middleware que verifica autenticación y agrega información del usuario
export const requireAuthWithUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Primero verificar autenticación
    await new Promise<void>((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Si llegamos aquí, la autenticación fue exitosa
    if (req.userId) {
      try {
        // Obtener información del usuario desde Clerk
        const user = await clerkClient.users.getUser(req.userId);
        req.user = user;
      } catch (userError) {
        console.error('Error getting user from Clerk:', userError);
        // Continuar sin información del usuario
      }
    }

    next();
  } catch (error) {
    // El error ya fue manejado por requireAuth
    return;
  }
};

// Middleware opcional de autenticación (no requiere auth pero la extrae si está presente)
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Si hay un header de Authorization, intentar extraer el userId
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (bearerToken) {
      try {
        // Verificar el token usando Clerk
        const tokenPayload = await verifyToken(bearerToken, {
          secretKey: process.env.CLERK_SECRET_KEY!,
        });

        if (tokenPayload) {
          // Agregar información de autenticación al request
          req.auth = {
            userId: tokenPayload.sub,
            sessionId: tokenPayload.sid || '',
          };
          req.userId = tokenPayload.sub;
          console.log('✅ Optional Auth - User authenticated:', tokenPayload.sub);
        }
             } catch (tokenError) {
         console.log('⚠️ Optional Auth - Invalid token, continuing without auth:', tokenError instanceof Error ? tokenError.message : String(tokenError));
         // Continuar sin autenticación si el token es inválido
       }
    }
    
    next();
  } catch (error) {
    // Si hay error en autenticación opcional, continuar sin autenticación
    console.log('⚠️ Optional Auth - Error, continuing without auth:', error instanceof Error ? error.message : String(error));
    next();
  }
};

// Middleware que verifica que el userId del token coincida con el parámetro de la ruta
export const requireOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tokenUserId = req.auth?.userId;
    const paramUserId = req.params.userId;

    console.log('🔍 Ownership Debug - URL:', req.originalUrl);
    console.log('🔍 Ownership Debug - Token User ID:', tokenUserId);
    console.log('🔍 Ownership Debug - Param User ID:', paramUserId);
    console.log('🔍 Ownership Debug - Match:', tokenUserId === paramUserId);

    if (!tokenUserId) {
      console.log('❌ Ownership Debug - No token user ID');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!paramUserId) {
      console.log('❌ Ownership Debug - No param user ID');
      return res.status(400).json({
        success: false,
        error: 'User ID parameter required',
      });
    }

    // Verificar que el usuario del token coincida con el parámetro de la ruta
    if (tokenUserId !== paramUserId) {
      console.log('❌ Ownership Debug - User ID mismatch');
      return res.status(403).json({
        success: false,
        error: 'Access denied - You can only access your own resources',
      });
    }

    console.log('✅ Ownership Debug - Access granted');
    next();
  } catch (error) {
    console.error('❌ Ownership Debug - Error in ownership middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization error',
    });
  }
};

// Middleware combinado que require autenticación Y ownership
export const requireAuthAndOwnership = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log('🛡️ [requireAuthAndOwnership] INICIO', req.method, req.originalUrl);
  try {
    // Primero verificar autenticación
    await new Promise<void>((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Luego verificar ownership
    await new Promise<void>((resolve, reject) => {
      requireOwnership(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('🛡️ [requireAuthAndOwnership] PASA ownership y auth');
    next();
  } catch (error) {
    console.error('🛡️ [requireAuthAndOwnership] ERROR:', error);
    // Los errores ya fueron manejados por los middlewares individuales
    return;
  }
}; 