import { Router } from 'express';
import { upload } from '../middlewares/upload';
import { subirDocumento } from '../controllers/documento.controller';

const router = Router();

// Endpoint multipart para la carga de archivos
router.post('/upload', upload.single('archivo'), subirDocumento);

export default router;