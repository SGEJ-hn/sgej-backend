import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth';

type UsuarioAutenticado = NonNullable<AuthenticatedRequest['usuario']>;
const normalizarRol = (rol: string) => rol.trim().toLowerCase();

export const esAdministrador = (usuario: UsuarioAutenticado) =>
  ['administrador', 'admin'].includes(normalizarRol(usuario.rol));

export const esPersonalLegal = (usuario: UsuarioAutenticado) =>
  esAdministrador(usuario) || ['abogado', 'paralegal'].includes(normalizarRol(usuario.rol));

export const filtroLecturaExpedientes = (usuario: UsuarioAutenticado): Prisma.ExpedienteWhereInput | null => {
  if (esAdministrador(usuario)) return {};
  if (normalizarRol(usuario.rol) === 'cliente') return { id_cliente: usuario.id_usuario };
  if (esPersonalLegal(usuario)) return { equipo: { some: { id_usuario: usuario.id_usuario } } };
  return null;
};

export const filtroGestionExpedientes = (usuario: UsuarioAutenticado): Prisma.ExpedienteWhereInput | null => {
  if (!esPersonalLegal(usuario)) return null;
  return esAdministrador(usuario) ? {} : { equipo: { some: { id_usuario: usuario.id_usuario } } };
};
