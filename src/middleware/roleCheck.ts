import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/express';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
  };
  userId?: string;
  userRole?: string;
  organizationId?: string | null;
}

// Middleware para verificar autenticación y obtener rol del usuario
export const checkUserRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Usar el userId del token JWT (ya verificado por requireAuth)
    const userId = req.auth?.userId || req.userId;
    
    console.log('🔍 Role Check Debug - URL:', req.originalUrl);
    console.log('🔍 Role Check Debug - User ID:', userId);
    
    if (!userId) {
      console.log('❌ Role Check Debug - No user ID found');
      return res.status(401).json({
        success: false,
        error: 'User ID not found in token',
      });
    }

    console.log('🔍 Role Check Debug - Fetching user from Clerk...');
    
    // Obtener información del usuario desde Clerk
    const user = await clerkClient.users.getUser(userId);
    
    console.log('🔍 Role Check Debug - Clerk user found:', !!user);
    
    if (!user) {
      console.log('❌ Role Check Debug - User not found in Clerk');
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    console.log('🔍 Role Check Debug - Fetching organization memberships...');

    // Obtener membresías de organización del usuario
    const organizationMemberships = await clerkClient.users.getOrganizationMembershipList({ userId });
    
    console.log('🔍 Role Check Debug - Organization memberships count:', organizationMemberships.data.length);
    
    // Por defecto, el usuario es 'guest'
    let userRole = 'guest';
    let organizationId = null;

    if (organizationMemberships.data.length > 0) {
      // Tomar la primera organización (puedes ajustar esta lógica según tus necesidades)
      const membership = organizationMemberships.data[0];
      userRole = membership.role; // 'admin', 'basic_member', etc.
      organizationId = membership.organization.id;
      
      console.log('🔍 Role Check Debug - User role:', userRole);
      console.log('🔍 Role Check Debug - Organization ID:', organizationId);
    } else {
      console.log('🔍 Role Check Debug - No organization memberships, defaulting to guest');
    }

    // Agregar información al request
    req.userId = userId;
    req.userRole = userRole;
    req.organizationId = organizationId;

    console.log('✅ Role Check Debug - Role check completed successfully');
    next();
  } catch (error) {
    console.error('❌ Role Check Debug - Error checking user role:', error);
    return res.status(500).json({
      success: false,
      error: 'Error verifying user role',
    });
  }
};

// Middleware para requerir rol de admin
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'org:admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  next();
};

// Middleware para requerir al menos rol normal (no guest)
export const requireMember = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.userRole === 'guest') {
    return res.status(403).json({
      success: false,
      error: 'Member access required',
    });
  }
  next();
};

// Función auxiliar para obtener todos los admins de una organización
export const getOrganizationAdmins = async (organizationId: string): Promise<string[]> => {
  try {
    const memberships = await clerkClient.organizations.getOrganizationMembershipList({
      organizationId,
      limit: 100, // Ajusta según sea necesario
    });

    const adminIds = memberships.data
      .filter(membership => membership.role === 'org:admin')
      .map(membership => membership.publicUserData?.userId)
      .filter(Boolean) as string[];

    return adminIds;
  } catch (error) {
    console.error('Error getting organization admins:', error);
    return [];
  }
}; 