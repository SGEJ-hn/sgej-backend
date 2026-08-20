import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import crypto from 'crypto';
import { EmailService } from '../services/email.service';

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

// ────────────────────────────────────────────────────────
// Solicitar recuperación de contraseña (Genera Token y Envía Correo)
// ────────────────────────────────────────────────────────
export const solicitarRecuperacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { correo } = req.body;

    if (!correo) {
      res.status(400).json({ error: 'El correo electrónico es obligatorio' });
      return;
    }

    // 1. Buscamos al usuario por correo
    const usuario = await prisma.usuario.findUnique({
      where: { correo: correo.toLowerCase().trim() },
    });

    if (!usuario) {
      // Retornamos "éxito" por seguridad para evitar enumeración de correos
      res.status(200).json({ 
        message: 'Si el correo existe en nuestro sistema, recibirá un enlace de recuperación.' 
      });
      return;
    }

    // 2. Generamos el token aleatorio
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // 3. Calculamos la expiración (15 minutos)
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 15);

    // 4. Guardamos el token en la BD
    await prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario },
      data: {
        reset_token: resetToken,
        reset_token_expires: expirationDate,
      },
    });

    // 5. Enviamos el correo en segundo plano (SIN await)
    EmailService.enviarCorreoRecuperacion(usuario.correo, resetToken).catch((err) => {
      console.error('Error enviando el correo de recuperación en segundo plano:', err);
    });

    // 6. Respondemos inmediatamente al cliente
    res.status(200).json({ 
      message: 'Si el correo existe en nuestro sistema, recibirá un enlace de recuperación.' 
    });
  } catch (error) {
    console.error('Error en solicitarRecuperacion:', error);
    res.status(500).json({ error: 'Error interno del servidor al solicitar recuperación' });
  }
};

// ────────────────────────────────────────────────────────
// Restablecer la contraseña (Valida Token y Actualiza Password)
// ────────────────────────────────────────────────────────
export const restablecerPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, nuevaContrasena } = req.body;

    if (!token || !nuevaContrasena) {
      res.status(400).json({ error: 'El token y la nueva contraseña son obligatorios' });
      return;
    }

    // 1. Validamos que exista un usuario con ese token Y que no haya expirado
    const usuario = await prisma.usuario.findFirst({
      where: {
        reset_token: token,
        reset_token_expires: {
          gt: new Date(), // Tiene que ser mayor a la fecha/hora actual
        },
      },
    });

    if (!usuario) {
      res.status(400).json({ error: 'El enlace es inválido o ha expirado. Por favor, solicite uno nuevo.' });
      return;
    }

    // 2. Encriptamos la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashContrasena = await bcrypt.hash(nuevaContrasena, salt);

    // 3. Actualizamos la BD y limpiamos el token de un solo golpe
    await prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario },
      data: {
        contrasena: hashContrasena,
        reset_token: null,
        reset_token_expires: null,
      },
    });

    res.status(200).json({ message: 'Contraseña actualizada correctamente. Ya puede iniciar sesión.' });
  } catch (error) {
    console.error('Error en restablecerPassword:', error);
    res.status(500).json({ error: 'Error interno del servidor al restablecer la contraseña' });
  }
};
