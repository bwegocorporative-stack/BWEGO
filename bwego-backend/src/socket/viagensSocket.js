
/**
 * ============================================
 * BWÉ GO - VIAGENS SOCKET
 * ============================================
 */

const db = require('../config/db');

function viagensSocket(io, socket) {

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

    const usuarioValido =
        Number.isSafeInteger(usuarioId) && usuarioId > 0;

    const motoristaValido =
        Number.isSafeInteger(motoristaId) && motoristaId > 0;

    if (!usuarioValido && !motoristaValido) {
        return;
    }

    // ----------------------------------------
    // VERIFICAR PARTICIPAÇÃO NA VIAGEM
    // ----------------------------------------

    async function verificarAcessoViagem(viagemId) {

        try {

            const [resultado] = await db.query(
                `SELECT id, usuario_id, motorista_id, estado
                 FROM viagens
                 WHERE id = ?
                 AND (
                     (? > 0 AND usuario_id = ?)
                     OR
                     (? > 0 AND motorista_id = ?)
                 )
                 LIMIT 1`,
                [
                    viagemId,
                    usuarioValido ? usuarioId : 0,
                    usuarioValido ? usuarioId : 0,
                    motoristaValido ? motoristaId : 0,
                    motoristaValido ? motoristaId : 0
                ]
            );

            return resultado.length > 0
                ? resultado[0]
                : null;

        } catch (erro) {

            console.error(
                'Erro ao verificar acesso à viagem:',
                erro.message
            );

            return null;
        }
    }

    // ----------------------------------------
    // ENTRAR NA SALA DA VIAGEM
    // ----------------------------------------

    socket.on('entrar-sala-viagem', async (dados) => {

        try {

            const viagemId = Number(
                typeof dados === 'object'
                    ? dados?.viagemId
                    : dados
            );

            if (
                !Number.isSafeInteger(viagemId) ||
                viagemId <= 0
            ) {
                return socket.emit('viagem:erro', {
                    sucesso: false,
                    mensagem: 'ID da viagem inválido.'
                });
            }

            // Verificar se o utilizador participa na viagem
            const viagem = await verificarAcessoViagem(viagemId);

            if (!viagem) {
                return socket.emit('viagem:erro', {
                    sucesso: false,
                    mensagem: 'Não tens autorização para acompanhar esta viagem.'
                });
            }

            const sala = `viagem_${viagemId}`;

            await socket.join(sala);

            socket.emit('viagem:entrou-sala', {
                sucesso: true,
                mensagem: 'Entraste na sala da viagem.',
                viagem: {
                    id: viagem.id,
                    estado: viagem.estado,
                    usuario_id: viagem.usuario_id,
                    motorista_id: viagem.motorista_id
                }
            });

            console.log(
                `Socket ${socket.id} entrou na sala ${sala}.`
            );

        } catch (erro) {

            console.error('Erro ao entrar na viagem:', erro);

            socket.emit('viagem:erro', {
                sucesso: false,
                mensagem: 'Não foi possível entrar na sala da viagem.'
            });
        }
    });

    // ----------------------------------------
    // SAIR DA SALA DA VIAGEM
    // ----------------------------------------

    socket.on('sair-sala-viagem', async (dados) => {

        try {

            const viagemId = Number(
                typeof dados === 'object'
                    ? dados?.viagemId
                    : dados
            );

            if (
                !Number.isSafeInteger(viagemId) ||
                viagemId <= 0
            ) {
                return socket.emit('viagem:erro', {
                    sucesso: false,
                    mensagem: 'ID da viagem inválido.'
                });
            }

            const sala = `viagem_${viagemId}`;

            // Só pode sair de uma sala em que entrou
            if (!socket.rooms.has(sala)) {
                return socket.emit('viagem:erro', {
                    sucesso: false,
                    mensagem: 'Não estás inscrito nesta viagem.'
                });
            }

            await socket.leave(sala);

            socket.emit('viagem:saiu-sala', {
                sucesso: true,
                mensagem: 'Saíste da sala da viagem.',
                viagemId
            });

        } catch (erro) {

            console.error('Erro ao sair da viagem:', erro);

            socket.emit('viagem:erro', {
                sucesso: false,
                mensagem: 'Não foi possível sair da sala.'
            });
        }
    });

    // ----------------------------------------
    // CONFIRMAR RECEÇÃO DE ATUALIZAÇÃO
    // ----------------------------------------

    socket.on('viagem:confirmar-atualizacao', (dados) => {

        const viagemId = Number(dados?.viagemId);

        if (
            !Number.isSafeInteger(viagemId) ||
            viagemId <= 0
        ) {
            return socket.emit('viagem:erro', {
                sucesso: false,
                mensagem: 'ID da viagem inválido.'
            });
        }

        const sala = `viagem_${viagemId}`;

        if (!socket.rooms.has(sala)) {
            return socket.emit('viagem:erro', {
                sucesso: false,
                mensagem: 'Não estás inscrito nesta viagem.'
            });
        }

        socket.emit('viagem:atualizacao-confirmada', {
            sucesso: true,
            viagemId,
            mensagem: 'Atualização da viagem recebida.'
        });
    });

    // ----------------------------------------
    // TESTAR CONEXÃO
    // ----------------------------------------

    socket.on('viagem:ping', () => {

        socket.emit('viagem:pong', {
            sucesso: true,
            mensagem: 'Socket de viagens ativo.',
            data: new Date().toISOString()
        });

    });

}

module.exports = viagensSocket;
