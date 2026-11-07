
/**
 * ============================================
 * BWÉ GO - PEDIDOS SOCKET
 * ============================================
 */

const db = require('../config/db');

function pedidosSocket(io, socket) {

    const utilizador = socket.user;

    const usuarioId = Number(
        utilizador?.id ||
        utilizador?.usuario_id ||
        utilizador?.userId
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

    // ----------------------------------------
    // VALIDAR UTILIZADOR
    // ----------------------------------------

    if (
        !Number.isSafeInteger(usuarioId) ||
        usuarioId <= 0
    ) {
        return;
    }

    // ----------------------------------------
    // VERIFICAR ACESSO AO PEDIDO
    // ----------------------------------------

    async function verificarAcessoPedido(pedidoId) {

        try {

            const [pedidos] = await db.query(
                `SELECT id
                 FROM pedidos
                 WHERE id = ?
                 AND (
                    usuario_id = ?
                    OR (? > 0 AND motorista_id = ?)
                    OR (? > 0 AND parceiro_id = ?)
                 )
                 LIMIT 1`,
                [
                    pedidoId,
                    usuarioId,
                    motoristaId,
                    motoristaId,
                    parceiroId,
                    parceiroId
                ]
            );

            return pedidos.length > 0;

        } catch (erro) {

            console.error(
                'Erro ao verificar acesso ao pedido:',
                erro.message
            );

            return false;
        }
    }

    // ----------------------------------------
    // ENTRAR NA SALA DO PEDIDO
    // ----------------------------------------

    socket.on('entrar-sala-pedido', async (dados) => {

        try {

            const pedidoId = Number(
                typeof dados === 'object'
                    ? dados?.pedidoId
                    : dados
            );

            if (
                !Number.isSafeInteger(pedidoId) ||
                pedidoId <= 0
            ) {
                return socket.emit('pedido:erro', {
                    sucesso: false,
                    mensagem: 'ID do pedido inválido.'
                });
            }

            const autorizado = await verificarAcessoPedido(
                pedidoId
            );

            if (!autorizado) {
                return socket.emit('pedido:erro', {
                    sucesso: false,
                    mensagem: 'Não tens autorização para acompanhar este pedido.'
                });
            }

            const sala = `pedido_${pedidoId}`;

            await socket.join(sala);

            socket.emit('pedido:entrou-sala', {
                sucesso: true,
                mensagem: 'Entraste na sala do pedido.',
                pedidoId
            });

            console.log(
                `Utilizador ${usuarioId} entrou na sala ${sala}.`
            );

        } catch (erro) {

            console.error('Erro Socket pedido:', erro);

            socket.emit('pedido:erro', {
                sucesso: false,
                mensagem: 'Não foi possível entrar na sala do pedido.'
            });
        }
    });

    // ----------------------------------------
    // SAIR DA SALA DO PEDIDO
    // ----------------------------------------

    socket.on('sair-sala-pedido', (dados) => {

        const pedidoId = Number(
            typeof dados === 'object'
                ? dados?.pedidoId
                : dados
        );

        if (
            !Number.isSafeInteger(pedidoId) ||
            pedidoId <= 0
        ) {
            return;
        }

        socket.leave(`pedido_${pedidoId}`);

        socket.emit('pedido:saiu-sala', {
            sucesso: true,
            pedidoId
        });
    });

    // ----------------------------------------
    // CONFIRMAR RECEÇÃO DE ATUALIZAÇÃO
    // ----------------------------------------

    socket.on('pedido:confirmar-atualizacao', (dados) => {

        const pedidoId = Number(dados?.pedidoId);

        if (
            !Number.isSafeInteger(pedidoId) ||
            pedidoId <= 0
        ) {
            return socket.emit('pedido:erro', {
                sucesso: false,
                mensagem: 'ID do pedido inválido.'
            });
        }

        if (!socket.rooms.has(`pedido_${pedidoId}`)) {
            return socket.emit('pedido:erro', {
                sucesso: false,
                mensagem: 'Não estás inscrito neste pedido.'
            });
        }

        socket.emit('pedido:atualizacao-confirmada', {
            sucesso: true,
            pedidoId,
            mensagem: 'Atualização recebida.'
        });
    });

    // ----------------------------------------
    // DESCONEXÃO
    // ----------------------------------------

    socket.on('disconnect', (motivo) => {

        console.log(
            `Socket do utilizador ${usuarioId} desconectado dos pedidos.`,
            motivo
        );

    });
}

module.exports = pedidosSocket;
