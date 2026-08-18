import {
  Request,
  Response,
  NextFunction
} from 'express';

import jwt from 'jsonwebtoken';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'mi_clave_secreta_super_segura_sgej';


export interface AuthenticatedRequest extends Request {

  usuario?: {
    id_usuario: string;
    nombre: string;
    correo: string;
    rol: string;
  };

}


// Verificar token

export const verificarToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {

  const authHeader =
    req.headers.authorization;


  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {

    res.status(401).json({
      error:
        'Acceso denegado. Token no proporcionado o inválido.'
    });

    return;
  }


  const token =
    authHeader.split(' ')[1];


  try {

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      ) as any;


    req.usuario = decoded;

    next();

  }

  catch (error) {

    res.status(401).json({
      error:
        'Token inválido o expirado. Inicie sesión nuevamente.'
    });

  }

};


// Solo administrador

export const soloAdministrador = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {

  if (!req.usuario) {

    res.status(401).json({
      error: 'Usuario no autenticado.'
    });

    return;
  }


  if (req.usuario.rol !== 'Administrador') {

    res.status(403).json({
      error:
        'No tiene permisos para realizar esta acción.'
    });

    return;
  }


  next();

};

export const soloPersonalLegal = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const rol = req.usuario?.rol?.trim().toLowerCase();
  if (!rol) {
    res.status(401).json({ error: 'Usuario no autenticado.' });
    return;
  }
  if (!['administrador', 'admin', 'abogado', 'paralegal'].includes(rol)) {
    res.status(403).json({ error: 'No tiene permisos para realizar esta acción.' });
    return;
  }
  next();
};
