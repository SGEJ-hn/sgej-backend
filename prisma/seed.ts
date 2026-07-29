import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando carga de datos de prueba (Seed)...');

  const passwordHash = await bcrypt.hash('12345678', 10);

  // Usuario Administrador principal
  const admin = await prisma.usuario.upsert({
    where: { correo: 'admin@gmail.com' },
    update: {
      nombre: 'Administrador',
      contrasena: passwordHash,
      rol: 'Administrador',
      estado: 'Activo',
    },
    create: {
      nombre: 'Administrador',
      correo: 'admin@gmail.com',
      contrasena: passwordHash,
      rol: 'Administrador',
      estado: 'Activo',
    },
  });

  console.log('✅ Usuario Administrador cargado exitosamente:');
  console.log(' - Correo:', admin.correo);
  console.log(' - Rol:', admin.rol);
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
