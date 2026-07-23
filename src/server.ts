import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
import documentoRoutes from './routes/documento.routes';

dotenv.config();

const { Pool } = pkg;

// Configuramos el pool de conexiones con la URL de Supabase
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Inicializamos Prisma pasándole el adaptador requerido por Prisma 7
const prisma = new PrismaClient({ adapter });

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

// Ruta de prueba para verificar conexión y la base de datos de Supabase
app.get('/api/usuarios', async (req: Request, res: Response) => {
    try {
        const usuarios = await prisma.usuario.findMany();
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al conectar con la base de datos de Supabase' });
    }
});

// Rutas de la API
app.use('/api/documentos', documentoRoutes);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});