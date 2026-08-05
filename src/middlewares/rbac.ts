import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

/**
 * Middleware para Control de Acceso Basado en Roles (RBAC).
 * Permite especificar uno o múltiples roles autorizados para acceder a una ruta.
 *
 * @param rolesPermitidos Rol único o arreglo de roles autorizados (ej: 'Administrador' o ['Administrador', 'Abogado'])
 */
export const verificarRol = (rolesPermitidos: string | string[]) => {
  const listaRoles = Array.isArray(rolesPermitidos) 
    ? rolesPermitidos.map(r => r.toLowerCase().trim()) 
    : [rolesPermitidos.toLowerCase().trim()];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // 1. Verificar si el usuario fue autenticado previamente por el middleware verificarToken
    if (!req.usuario) {
      res.status(401).json({ error: 'Acceso no autorizado. Usuario no autenticado.' });
      return;
    }

    const rolUsuario = req.usuario.rol?.toLowerCase().trim();

    // 2. Comprobar si el rol del usuario en sesión está dentro de la lista de roles permitidos
    if (!rolUsuario || !listaRoles.includes(rolUsuario)) {
      res.status(403).json({ 
        error: 'Acceso denegado. No posee los permisos necesarios (Rol no autorizado) para acceder a este recurso.' 
      });
      return;
    }

    // 3. Permiso concedido
    next();
  };
};

/**
 * Middleware de acceso exclusivo para el Administrador
 */
export const soloAdmin = verificarRol(['Administrador']);

/**
 * Middleware de acceso para el Equipo Legal (Administrador y Abogado)
 */
export const soloPersonal = verificarRol(['Administrador', 'Abogado']);
