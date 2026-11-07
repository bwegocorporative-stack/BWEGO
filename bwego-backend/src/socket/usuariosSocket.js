
/**
 * ============================================
 * BWÉ GO - USUARIOS SOCKET
 * ============================================
 */

function usuariosSocket(io, socket) {

    // ----------------------------------------
    // IDENTIFICAR UTILIZADOR AUTENTICADO
    // ----------------------------------------

    const utilizador = socket.user;

    const usuarioId = Number(
        utilizador?.id ||
        utilizador?.usuario_id ||
        utilizador?.userId
    );

    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
        socket.emit('socket-erro', {
            sucesso: false,
            mensagem: 'Identificação do utilizador inválida.'
        });

        return;
    }

    // ----------------------------------------
    // SALA PRIVADA DO UTILIZADOR
    // ----------------------------------------

    const salaUsuario = `usuario_${usuarioId}`;

    socket.join(salaUsuario);

    socket.data.usuarioId = usuarioId;

    console.log(
        `Utilizador ${usuarioId} entrou na sala ${salaUsuario}`
    );

    // ----------------------------------------
    // CONFIRMAR CONEXÃO
    // ----------------------------------------

    socket.emit('usuario:conectado', {
        sucesso: true,
        mensagem: 'Conexão estabelecida com sucesso.',
        usuarioId,
        socketId: socket.id
    });

    // ----------------------------------------
    // TESTAR CONEXÃO
    // ----------------------------------------

    socket.on('usuario:ping', () => {

        socket.emit('usuario:pong', {
            sucesso: true,
            mensagem: 'Socket do utilizador está ativo.',
            usuarioId,
            data: new Date().toISOString()
        });

    });

    // ----------------------------------------
    // CONFIRMAR RECEBIMENTO DE NOTIFICAÇÃO
    // ----------------------------------------

    socket.on('usuario:notificacao-recebida', (dados) => {

        const notificacaoId = Number(dados?.notificacaoId);

        if (!Number.isSafeInteger(notificacaoId) || notificacaoId <= 0) {
            return socket.emit('socket-erro', {
                sucesso: false,
                mensagem: 'ID da notificação inválido.'
            });
        }

        console.log(
            `Utilizador ${usuarioId} recebeu a confirmação da notificação ${notificacaoId}.`
        );

        socket.emit('usuario:notificacao-confirmada', {
            sucesso: true,
            notificacaoId
        });

    });

    // ----------------------------------------
    // DESCONEXÃO
    // ----------------------------------------

    socket.on('disconnect', (motivo) => {

        console.log(
            `Utilizador ${usuarioId} desconectado.`,
            motivo
        );

    });
}

module.exports = usuariosSocket;
