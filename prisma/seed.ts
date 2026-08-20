import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 Iniciando la eliminación de los expedientes...');

  // Eliminamos los datos dependientes primero para evitar errores de claves foráneas
  await prisma.historialExpediente.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.citaParticipante.deleteMany();
  await prisma.cita.deleteMany();
  await prisma.parteInvolucrada.deleteMany();
  await prisma.expedienteEquipo.deleteMany();

  // Finalmente, eliminamos todos los expedientes
  const expedientesBorrados = await prisma.expediente.deleteMany();

  console.log(`✅ ¡Éxito! Se eliminaron ${expedientesBorrados.count} expedientes y todos sus datos relacionados.`);
  console.log('👥 (Tus usuarios siguen intactos en la base de datos).');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la limpieza de expedientes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });