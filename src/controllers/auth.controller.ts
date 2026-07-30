import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura_sgej';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      res.status(400).json({ error: 'El correo electrónico y la contraseña son obligatorios' });
      return;
    }

    // 1. Buscar usuario por correo
    const usuario = await prisma.usuario.findUnique({
      where: { correo: correo.toLowerCase().trim() },
    });

    if (!usuario) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    // 2. Validar contraseña
    const esValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!esValida) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    // 3. Verificar estado del usuario
    if (usuario.estado !== 'Activo') {
      res.status(403).json({ error: 'La cuenta se encuentra inactiva o suspendida. Contacte al administrador.' });
      return;
    }

    // 4. Actualizar fecha de último acceso
    await prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario },
      data: { ultimo_acceso: new Date() },
    });

    // 5. Generar token JWT
    const payload = {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // 6. Enviar respuesta exitosa
    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        estado: usuario.estado,
      },
    });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar el inicio de sesión' });
  }
};

export const getPerfil = async (req: Request & { usuario?: any }, res: Response): Promise<void> => {
  try {
    const id_usuario = req.usuario?.id_usuario;
    if (!id_usuario) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario },
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
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al consultar el perfil de usuario' });
  }
};
