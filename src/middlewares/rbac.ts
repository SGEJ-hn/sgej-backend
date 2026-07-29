import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export const verificarRol = (rolesPermitidos: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      res.status(403).json({ error: 'No posee los permisos necesarios para realizar esta acción' });
      return;
    }

    next();
  };
};
