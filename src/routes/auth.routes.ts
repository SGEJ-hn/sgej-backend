import { Router } from 'express';
import { login, getPerfil, solicitarRecuperacion, restablecerPassword } from '../controllers/auth.controller';
import { verificarToken } from '../middlewares/auth';

const router = Router();

// POST /api/auth/login -> Iniciar sesión
router.post('/login', login);

// GET /api/auth/perfil -> Obtener datos del usuario logueado
router.get('/perfil', verificarToken, getPerfil);

// POST /api/auth/olvide-password -> Recibe el correo y manda el email con el token
router.post('/olvide-password', solicitarRecuperacion);

// POST /api/auth/reset-password -> Recibe el token y la nueva contraseña
router.post('/reset-password', restablecerPassword);

export default router;
