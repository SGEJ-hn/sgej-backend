import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Cargar las variables de entorno
dotenv.config();

// Extraemos la URL de tu base de datos desde el .env
const connectionString = process.env.DATABASE_URL;

// Configuramos el pool de conexiones usando el driver 'pg'
const pool = new Pool({ connectionString });

// Le pasamos el pool al adaptador de Prisma
const adapter = new PrismaPg(pool);

// Inicializamos Prisma con el adaptador requerido
const prisma = new PrismaClient({ adapter });

export default prisma;