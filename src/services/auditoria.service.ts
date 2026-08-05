import { prisma } from '../config/db';

export const registrarAuditoria = async (
    idExpediente: string,
    idAutor: string,
    categoriaEvento: string,
    tituloEvento: string,
    descripcion: string
) => {
    try {

        await prisma.historialExpediente.create({
            data: {
                id_expediente: idExpediente,
                id_autor: idAutor,
                categoria_evento: categoriaEvento,
                titulo_evento: tituloEvento,
                descripcion: descripcion
            }
        });

        console.log('✅ Registro de auditoría creado');

    } catch (error) {
        console.error('❌ Error al registrar auditoría:', error);
    }
};