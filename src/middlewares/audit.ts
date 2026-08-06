import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { registrarAuditoria } from '../services/auditoria.service';

export const audit = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {

    res.on('finish', async () => {

        console.log('AUDIT EJECUTADO');
        console.log('Método:', req.method);
        console.log('Usuario:', req.usuario);

        const metodosAuditados = ['POST', 'PUT', 'PATCH', 'DELETE'];

        if (!metodosAuditados.includes(req.method)) {
            console.log('Método no auditado');
            return;
        }

        if (!req.usuario) {
            console.log('No existe usuario autenticado');
            return;
        }

        const idExpediente =
            req.params.id || req.body.id_expediente;

        if (!idExpediente) {
            console.log('No existe id de expediente');
            return;
        }

        let accion = '';

        switch (req.method) {
            case 'POST':
                accion = 'CREACION';
                break;

            case 'PUT':
            case 'PATCH':
                accion = 'ACTUALIZACION';
                break;

            case 'DELETE':
                accion = 'ELIMINACION';
                break;
        }

        await registrarAuditoria(
            idExpediente,
            req.usuario.id_usuario,
            'EXPEDIENTE',
            `Acción ${accion} de expediente`,
            `El usuario ${req.usuario.nombre} realizó una acción ${accion} sobre el expediente ${idExpediente}`
        );

        console.log('Auditoría registrada');
    });

    next();
};