import { Router } from 'express';
import { login, getPerfil } from '../controllers/auth.controller';
import { verificarToken } from '../middlewares/auth';

const router = Router();

// POST /api/auth/login -> Iniciar sesión
router.post('/login', login);

// GET /api/auth/perfil -> Obtener datos del usuario logueado
router.get('/perfil', verificarToken, getPerfil);

export default router;
