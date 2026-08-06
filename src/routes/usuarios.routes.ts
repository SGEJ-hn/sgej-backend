import { Router } from 'express';
import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from '../controllers/usuario.controller';
import { verificarToken } from '../middlewares/auth';
import { soloAdmin } from '../middlewares/rbac';

const router = Router();

// =========================================================================
// RUTAS DE GESTIÓN DE USUARIOS PROTEGIDAS CON RBAC
// Todas las rutas requieren token activo (verificarToken) y rol Administrador (soloAdmin)
// =========================================================================

// GET /api/usuarios -> Listar todos los usuarios
router.get('/', verificarToken, soloAdmin, obtenerUsuarios);

// GET /api/usuarios/:id -> Consultar un usuario específico por ID
router.get('/:id', verificarToken, soloAdmin, obtenerUsuarioPorId);

// POST /api/usuarios -> Crear nuevo usuario (Abogado, Paralegal o Cliente)
router.post('/', verificarToken, soloAdmin, crearUsuario);

// PUT /api/usuarios/:id -> Actualizar datos o cambiar estado/rol de un usuario
router.put('/:id', verificarToken, soloAdmin, actualizarUsuario);

// DELETE /api/usuarios/:id -> Eliminar un usuario
router.delete('/:id', verificarToken, soloAdmin, eliminarUsuario);

export default router;
