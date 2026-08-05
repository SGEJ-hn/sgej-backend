import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './config/db';
import documentoRoutes from './routes/documento.routes';
import authRoutes from './routes/auth.routes';
import usuarioRoutes from './routes/usuarios.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'https://sgej-frontend.vercel.app',
    'http://localhost:4200'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Ruta de prueba para verificar conexión y estado del servidor
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const totalUsuarios = await prisma.usuario.count();
    res.json({ status: 'OK', usuarios: totalUsuarios, timestamp: new Date() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
});

// Rutas de la API protegidas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/documentos', documentoRoutes);

app.listen(PORT, () => {
  console.log(`Servidor backend SGEJ corriendo en http://localhost:${PORT}`);
});