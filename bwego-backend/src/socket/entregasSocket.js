
/**
 * ============================================
 * BWÉ GO - ENTREGAS SOCKET
 * ============================================
 */

const db = require('../config/db');

function entregasSocket(io, socket) {

    // ----------------------------------------
    // IDENTIFICAR UTILIZADOR AUTENTICADO
    // ----------------------------------------

    const utilizador = socket.user;

    const usuarioId = Number(
        utilizador?.usuario_id ||
        utilizador?.userId ||
        utilizador?.id ||
        0
    );

    const motoristaId = Number(
        utilizador?.motorista_id ||
        utilizador?.motoristaId ||
        0
    );

    const parceiroId = Number(
        utilizador?.parceiro_id ||
        utilizador?.parceiroId ||
        0
    );

    const usuarioValido =
        Number.isSafeInteger(usuarioId) && usuarioId > 0;

    const motoristaValido =
        Number.isSafeInteger(motoristaId) && motoristaId > 0;

    const parceiroValido =
        Number.isSafeInteger(parceiroId) && parceiroId > 0;

    if (!usuarioValido && !motoristaValido && !parceiroValido) {
        return;
    }

    // ----------------------------------------
    // VERIFICAR ACESSO À ENTREGA
    // ----------------------------------------

    async function verificarAcessoEntrega(entregaId) {

        try {

            const [resultado] = await db.query(
                `SELECT id, usuario_id, motorista_id, parceiro_id, estado
                 FROM entregas
                 WHERE id = ?
                 AND (
                     (? > 0 AND usuario_id = ?)
                     OR
                     (? > 0 AND motorista_id = ?)
                     OR
                     (? > 0 AND parceiro_id = ?)
                 )
                 LIMIT 1`,
                [
                    entregaId,

                    usuarioValido ? usuarioId : 0,
                    usuarioValido ? usuarioId : 0,

                    motoristaValido ? motoristaId : 0,
                    motoristaValido ? motoristaId : 0,

                    parceiroValido ? parceiroId : 0,
                    parceiroValido ? parceiroId : 0
                ]
            );

            return resultado.length > 0
                ? resultado[0]
                : null;

        } catch (erro) {

            console.error(
                'Erro ao verificar acesso à entrega:',
                erro.message
            );

            return null;
        }
    }

    // ----------------------------------------
    // ENTRAR NA SALA DA ENTREGA
    // ----------------------------------------

    socket.on('entrar-sala-entrega', async (dados) => {

        try {

            const entregaId = Number(
                typeof dados === 'object'
                    ? dados?.entregaId
                    : dados
            );

            if (
                !Number.isSafeInteger(entregaId) ||
                entregaId <= 0
            ) {
                return socket.emit('entrega:erro', {
                    sucesso: false,
                    mensagem: 'ID da entrega inválido.'
                });
            }

            const entrega = await verificarAcessoEntrega(entregaId);

            if (!entrega) {
                return socket.emit('entrega:erro', {
                    sucesso: false,
                    mensagem: 'Não tens autorização para acompanhar esta entrega.'
                });
            }

            const sala = `entrega_${entregaId}`;

            await socket.join(sala);

            socket.emit('entrega:entrou-sala', {
                sucesso: true,
                mensagem: 'Entraste na sala da entrega.',
                entrega: {
                    id: entrega.id,
                    estado: entrega.estado,
                    usuario_id: entrega.usuario_id,
                    motorista_id: entrega.motorista_id,
                    parceiro_id: entrega.parceiro_id
                }
            });

            console.log(
                `Socket ${socket.id} entrou na sala ${sala}.`
            );

        } catch (erro) {

            console.error('Erro ao entrar na entrega:', erro);

            socket.emit('entrega:erro', {
                sucesso: false,
                mensagem: 'Não foi possível entrar na sala da entrega.'
            });
        }
    });

    // ----------------------------------------
    // SAIR DA SALA DA ENTREGA
    // ----------------------------------------

    socket.on('sair-sala-entrega', async (dados) => {

        const entregaId = Number(
            typeof dados === 'object'
                ? dados?.entregaId
                : dados
        );

        if (
            !Number.isSafeInteger(entregaId) ||
            entregaId <= 0
        ) {
            return socket.emit('entrega:erro', {
                sucesso: false,
                mensagem: 'ID da entrega inválido.'
            });
        }

        const sala = `entrega_${entregaId}`;

        if (!socket.rooms.has(sala)) {
            return socket.emit('entrega:erro', {
                sucesso: false,
                mensagem: 'Não estás inscrito nesta entrega.'
            });
        }

        await socket.leave(sala);

        socket.emit('entrega:saiu-sala', {
            sucesso: true,
            mensagem: 'Saíste da sala da entrega.',
            entregaId
        });
    });

    // ----------------------------------------
    // CONFIRMAR RECEÇÃO DE ATUALIZAÇÃO
    // ----------------------------------------

    socket.on('entrega:confirmar-atualizacao', (dados) => {

        const entregaId = Number(dados?.entregaId);

        if (
            !Number.isSafeInteger(entregaId) ||
            entregaId <= 0
        ) {
            return socket.emit('entrega:erro', {
                sucesso: false,
                mensagem: 'ID da entrega inválido.'
            });
        }

        if (!socket.rooms.has(`entrega_${entregaId}`)) {
            return socket.emit('entrega:erro', {
                sucesso: false,
                mensagem: 'Não estás inscrito nesta entrega.'
            });
        }

        socket.emit('entrega:atualizacao-confirmada', {
            sucesso: true,
            entregaId,
            mensagem: 'Atualização da entrega recebida.'
        });
    });

    // ----------------------------------------
    // TESTAR CONEXÃO
    // ----------------------------------------

    socket.on('entrega:ping', () => {

        socket.emit('entrega:pong', {
            sucesso: true,
            mensagem: 'Socket de entregas ativo.',
            data: new Date().toISOString()
        });

    });

}

module.exports = entregasSocket;
