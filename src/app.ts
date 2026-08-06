import express from 'express';
import cors from 'cors';

import citasRoutes from './routes/citas.routes';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.status(200).json({
    mensaje: 'API SGEJ funcionando correctamente'
  });
});

// Rutas de Citas
app.use('/api/citas', citasRoutes);

export default app;