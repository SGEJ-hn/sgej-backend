import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';

/**
 * Obtener todos los usuarios (filtrable por rol o estado)
 */
export const obtenerUsuarios = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rol, estado, busqueda } = req.query as { rol?: string; estado?: string; busqueda?: string };

    const whereClause: any = {};

    if (rol) {
      whereClause.rol = String(rol);
    }

    if (estado) {
      whereClause.estado = String(estado);
    }

    if (busqueda) {
      whereClause.OR = [
        { nombre: { contains: String(busqueda), mode: 'insensitive' } },
        { correo: { contains: String(busqueda), mode: 'insensitive' } },
      ];
    }

    const usuarios = await prisma.usuario.findMany({
      where: whereClause,
      select: {
        id_usuario: true,
        nombre: true,
        correo: true,
        rol: true,
        estado: true,
        ultimo_acceso: true,
      },
      orderBy: { nombre: 'asc' },
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al consultar el listado de usuarios' });
  }
};

/**
 * Obtener detalle de un usuario por ID
 */
export const obtenerUsuarioPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: id },
      select: {
        id_usuario: true,
        nombre: true,
        correo: true,
        rol: true,
        estado: true,
        ultimo_acceso: true,
      },
    });

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al consultar el usuario' });
  }
};

/**
 * Crear un nuevo usuario (Solo Admin)
 */
export const crearUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, correo, contrasena, rol, estado } = req.body;

    if (!nombre || !correo || !contrasena || !rol) {
      res.status(400).json({ error: 'Nombre, correo, contraseña y rol son obligatorios' });
      return;
    }

    const correoFormateado = correo.toLowerCase().trim();

    // Verificar si el correo ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { correo: correoFormateado },
    });

    if (usuarioExistente) {
      res.status(400).json({ error: 'Ya existe un usuario registrado con este correo electrónico' });
      return;
    }

    // Encriptar la contraseña
    const passwordHash = await bcrypt.hash(contrasena, 10);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        correo: correoFormateado,
        contrasena: passwordHash,
        rol,
        estado: estado || 'Activo',
      },
      select: {
        id_usuario: true,
        nombre: true,
        correo: true,
        rol: true,
        estado: true,
      },
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: nuevoUsuario,
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al registrar el nuevo usuario' });
  }
};

/**
 * Actualizar datos de un usuario existente
 */
export const actualizarUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { nombre, correo, rol, estado, contrasena } = req.body;

    const usuarioExiste = await prisma.usuario.findUnique({
      where: { id_usuario: id },
    });

    if (!usuarioExiste) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const dataToUpdate: any = {};

    if (nombre) dataToUpdate.nombre = nombre.trim();
    if (correo) dataToUpdate.correo = correo.toLowerCase().trim();
    if (rol) dataToUpdate.rol = rol;
    if (estado) dataToUpdate.estado = estado;
    if (contrasena) {
      dataToUpdate.contrasena = await bcrypt.hash(contrasena, 10);
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id_usuario: id },
      data: dataToUpdate,
      select: {
        id_usuario: true,
        nombre: true,
        correo: true,
        rol: true,
        estado: true,
      },
    });

    res.json({
      message: 'Usuario actualizado exitosamente',
      usuario: usuarioActualizado,
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al modificar los datos del usuario' });
  }
};

/**
 * Eliminar un usuario por ID
 */
export const eliminarUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const usuarioExiste = await prisma.usuario.findUnique({
      where: { id_usuario: id },
    });

    if (!usuarioExiste) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    await prisma.usuario.delete({
      where: { id_usuario: id },
    });

    res.json({ message: 'Usuario eliminado correctamente de la base de datos' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'No se puede eliminar el usuario si posee registros asociados (expedientes, historial o citas).' });
  }
};
