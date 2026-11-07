
/**
 * ============================================
 * BWÉ GO - MOTORISTAS SOCKET
 * ============================================
 */

function motoristasSocket(io, socket) {

    // ----------------------------------------
    // IDENTIFICAR MOTORISTA AUTENTICADO
    // ----------------------------------------

    const utilizador = socket.user;

    const tipoUtilizador = String(
        utilizador?.tipo_usuario ||
        utilizador?.tipo ||
        utilizador?.role ||
        utilizador?.cargo ||
        ''
    ).toLowerCase();

    const motoristaId = Number(
        utilizador?.motorista_id ||
        utilizador?.motoristaId ||
        (
            ['motorista', 'driver'].includes(tipoUtilizador)
                ? utilizador?.id || utilizador?.usuario_id
                : 0
        )
    );

    if (!Number.isSafeInteger(motoristaId) || motoristaId <= 0) {
        return;
    }

    // ----------------------------------------
    // SALA PRIVADA DO MOTORISTA
    // ----------------------------------------

    const salaMotorista = `motorista_${motoristaId}`;

    socket.join(salaMotorista);

    socket.data.motoristaId = motoristaId;

    console.log(
        `Motorista ${motoristaId} conectado à sua sala.`
    );

    // ----------------------------------------
    // CONFIRMAR CONEXÃO
    // ----------------------------------------

    socket.emit('motorista:conectado', {
        sucesso: true,
        mensagem: 'Motorista conectado com sucesso.',
        motoristaId,
        socketId: socket.id
    });

    // ----------------------------------------
    // TESTAR CONEXÃO
    // ----------------------------------------

    socket.on('motorista:ping', () => {

        socket.emit('motorista:pong', {
            sucesso: true,
            motoristaId,
            mensagem: 'Socket do motorista está ativo.',
            data: new Date().toISOString()
        });

    });

    // ----------------------------------------
    // ATUALIZAR LOCALIZAÇÃO GPS
    // ----------------------------------------

    socket.on('motorista:localizacao', (dados) => {

        const latitude = Number(dados?.latitude);
        const longitude = Number(dados?.longitude);

        const precisao = dados?.precisao !== undefined
            ? Number(dados.precisao)
            : null;

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return socket.emit('motorista:erro', {
                sucesso: false,
                mensagem: 'Coordenadas GPS inválidas.'
            });
        }

        if (
            precisao !== null &&
            (!Number.isFinite(precisao) || precisao < 0)
        ) {
            return socket.emit('motorista:erro', {
                sucesso: false,
                mensagem: 'Precisão GPS inválida.'
            });
        }

        const localizacao = {
            motoristaId,
            latitude,
            longitude,
            precisao,
            atualizadoEm: new Date().toISOString()
        };

        // Guardar a última localização nesta conexão.
        socket.data.localizacao = localizacao;

        // Confirmar receção ao próprio motorista.
        socket.emit('motorista:localizacao-confirmada', {
            sucesso: true,
            mensagem: 'Localização recebida com sucesso.',
            localizacao
        });

        // Disponibilizar a localização apenas aos sockets
        // associados à sala privada deste motorista.
        socket.to(salaMotorista).emit(
            'motorista:localizacao-atualizada',
            localizacao
        );

    });

    // ----------------------------------------
    // ATUALIZAR DISPONIBILIDADE
    // ----------------------------------------

    socket.on('motorista:disponibilidade', (dados) => {

        const estadosPermitidos = [
            'disponivel',
            'indisponivel'
        ];

        const estado = dados?.estado;

        if (!estadosPermitidos.includes(estado)) {
            return socket.emit('motorista:erro', {
                sucesso: false,
                mensagem: 'Estado de disponibilidade inválido.'
            });
        }

        socket.data.disponibilidade = estado;

        const resposta = {
            sucesso: true,
            motoristaId,
            estado,
            atualizadoEm: new Date().toISOString()
        };

        socket.emit(
            'motorista:disponibilidade-atualizada',
            resposta
        );

        socket.to(salaMotorista).emit(
            'motorista:estado-atualizado',
            resposta
        );

        console.log(
            `Motorista ${motoristaId}: ${estado}`
        );

    });

    // ----------------------------------------
    // DESCONEXÃO
    // ----------------------------------------

    socket.on('disconnect', (motivo) => {

        console.log(
            `Motorista ${motoristaId} desconectado.`,
            motivo
        );

    });
}

module.exports = motoristasSocket;
