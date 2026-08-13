import { Router } from 'express';
import { upload } from '../middlewares/upload';
import { 
  subirDocumento, 
  obtenerDocumentosPorExpediente, 
  eliminarDocumento,
  actualizarDocumento 
} from '../controllers/documento.controller';

// 🌟 Importa tu middleware de autenticación
// (Ajusta el nombre del archivo y función según tu estructura de middlewares)
import { verificarToken } from '../middlewares/auth'; 

const router = Router();

// POST: Subir documento (Requiere token para extraer el id_usuario)
router.post('/upload', verificarToken, upload.single('archivo'), subirDocumento);

// GET: Obtener documentos de un expediente
router.get('/expediente/:id_expediente', verificarToken, obtenerDocumentosPorExpediente);

// DELETE: Eliminar documento
router.delete('/:id_documento', verificarToken, eliminarDocumento);

// PATCH: Actualizar nombre y/o categoría del documento
router.patch('/:id_documento', verificarToken, actualizarDocumento); 

export default router;