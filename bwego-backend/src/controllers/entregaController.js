
const mysql = require('../config/db');

// ============================================
// CONFIGURAÇÕES
// ============================================

const TIPOS_ENTREGA = [
    'documento',
    'encomenda',
    'compras',
    'outro'
];

const ESTADOS_ENTREGA = [
    'pendente',
    'aceite',
    'recolhida',
    'em_transito',
    'entregue',
    'cancelada'
];

const ESTADOS_MOTORISTA = [
    'aceite',
    'recolhida',
    'em_transito',
    'entregue'
];

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const validarCoordenada = (valor, minimo, maximo) => {
    const numero = Number(valor);

    return (
        valor !== undefined &&
        valor !== null &&
        valor !== '' &&
        Number.isFinite(numero) &&
        numero >= minimo &&
        numero <= maximo
    );
};

const obterUsuario = (req) => {
    return req.user || null;
};

const obterMotoristaId = async (usuarioId) => {
    const [motoristas] = await mysql.execute(
        `SELECT id
         FROM motoristas
         WHERE usuario_id = ?
         LIMIT 1`,
        [usuarioId]
    );

    return motoristas.length ? motoristas[0].id : null;
};

const verificarAcesso = async (req, entrega) => {
    const usuario = obterUsuario(req);

    if (!usuario) return false;

    if (usuario.tipo === 'admin') return true;

    if (
        usuario.tipo === 'cliente' &&
        Number(entrega.cliente_id) === Number(usuario.id)
    ) {
        return true;
    }

    if (usuario.tipo === 'motorista') {
        const motoristaId = await obterMotoristaId(usuario.id);

        return (
            motoristaId !== null &&
            Number(entrega.entregador_id) === Number(motoristaId)
        );
    }

    return false;
};

const registrarHistorico = async (
    conexao,
    entregaId,
    estado,
    usuarioId,
    observacao = null
) => {
    await conexao.execute(
        `INSERT INTO historico_entregas (
            entrega_id,
            estado,
            alterado_por,
            observacao
        ) VALUES (?, ?, ?, ?)`,
        [
            entregaId,
            estado,
            usuarioId || null,
            observacao
        ]
    );
};

// ============================================
// 1. CRIAR ENTREGA
// POST /api/entregas
// ============================================

exports.criar = async (req, res) => {
    let conexao;

    try {
        const usuario = obterUsuario(req);

        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Autenticação necessária.'
            });
        }

        if (usuario.tipo !== 'cliente') {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas clientes podem solicitar entregas.'
            });
        }

        const {
            tipo,
            descricao,
            remetente_nome,
            remetente_telefone,
            origem_endereco,
            origem_latitude,
            origem_longitude,
            destinatario_nome,
            destinatario_telefone,
            destino_endereco,
            destino_latitude,
            destino_longitude
        } = req.body || {};

        // Validar tipo
        const tipoFinal = tipo || 'encomenda';

        if (!TIPOS_ENTREGA.includes(tipoFinal)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Tipo de entrega inválido.'
            });
        }

        // Validar campos obrigatórios
        const campos = {
            descricao,
            remetente_nome,
            remetente_telefone,
            origem_endereco,
            destinatario_nome,
            destinatario_telefone,
            destino_endereco
        };

        for (const [campo, valor] of Object.entries(campos)) {
            if (
                typeof valor !== 'string' ||
                !valor.trim()
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: `O campo ${campo} é obrigatório.`
                });
            }
        }

        // Validar comprimentos
        if (descricao.trim().length > 500) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A descrição não pode ultrapassar 500 caracteres.'
            });
        }

        if (
            remetente_nome.trim().length > 150 ||
            destinatario_nome.trim().length > 150
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Os nomes não podem ultrapassar 150 caracteres.'
            });
        }

        if (
            remetente_telefone.trim().length > 30 ||
            destinatario_telefone.trim().length > 30
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Número de telefone demasiado longo.'
            });
        }

        if (
            origem_endereco.trim().length > 255 ||
            destino_endereco.trim().length > 255
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O endereço não pode ultrapassar 255 caracteres.'
            });
        }

        // Validar coordenadas
        if (
            !validarCoordenada(origem_latitude, -90, 90) ||
            !validarCoordenada(origem_longitude, -180, 180) ||
            !validarCoordenada(destino_latitude, -90, 90) ||
            !validarCoordenada(destino_longitude, -180, 180)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Coordenadas de origem ou destino inválidas.'
            });
        }

        // Iniciar transação
        conexao = await mysql.getConnection();
        await conexao.beginTransaction();

        // Verificar se o cliente existe e está ativo
        const [clientes] = await conexao.execute(
            `SELECT id
             FROM usuarios
             WHERE id = ?
               AND tipo = 'cliente'
               AND ativo = TRUE
             LIMIT 1`,
            [usuario.id]
        );

        if (clientes.length === 0) {
            await conexao.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Cliente não encontrado ou desativado.'
            });
        }

        // Criar entrega
        const [resultado] = await conexao.execute(
            `INSERT INTO entregas (
                cliente_id,
                tipo,
                descricao,
                remetente_nome,
                remetente_telefone,
                origem_endereco,
                origem_latitude,
                origem_longitude,
                destinatario_nome,
                destinatario_telefone,
                destino_endereco,
                destino_latitude,
                destino_longitude,
                moeda,
                estado
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AOA', 'pendente'
            )`,
            [
                usuario.id,
                tipoFinal,
                descricao.trim(),
                remetente_nome.trim(),
                remetente_telefone.trim(),
                origem_endereco.trim(),
                Number(origem_latitude),
                Number(origem_longitude),
                destinatario_nome.trim(),
                destinatario_telefone.trim(),
                destino_endereco.trim(),
                Number(destino_latitude),
                Number(destino_longitude)
            ]
        );

        // Registar histórico inicial
        await registrarHistorico(
            conexao,
            resultado.insertId,
            'pendente',
            usuario.id,
            'Entrega solicitada pelo cliente.'
        );

        await conexao.commit();

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Entrega solicitada com sucesso.',
            entrega: {
                id: resultado.insertId,
                cliente_id: usuario.id,
                tipo: tipoFinal,
                descricao: descricao.trim(),
                estado: 'pendente',
                moeda: 'AOA'
            }
        });

    } catch (erro) {
        if (conexao) {
            await conexao.rollback().catch(() => {});
        }

        console.error('Erro ao criar entrega:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao solicitar entrega.'
        });

    } finally {
        if (conexao) conexao.release();
    }
};

// ============================================
// 2. LISTAR ENTREGAS
// GET /api/entregas
// ============================================

exports.listar = async (req, res) => {
    try {
        const usuario = obterUsuario(req);

        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Autenticação necessária.'
            });
        }

        const pagina = Math.max(
            1,
            parseInt(req.query.pagina, 10) || 1
        );

        const limite = Math.min(
            100,
            Math.max(1, parseInt(req.query.limite, 10) || 20)
        );

        const offset = (pagina - 1) * limite;

        let condicao = '';
        let parametros = [];

        if (usuario.tipo === 'cliente') {
            condicao = 'WHERE e.cliente_id = ?';
            parametros = [usuario.id];

        } else if (usuario.tipo === 'motorista') {
            condicao = `
                INNER JOIN motoristas m
                    ON m.id = e.entregador_id
                WHERE m.usuario_id = ?
            `;
            parametros = [usuario.id];

        } else if (usuario.tipo !== 'admin') {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Não tem autorização para consultar entregas.'
            });
        }

        const [entregas] = await mysql.execute(
            `SELECT e.*
             FROM entregas e
             ${condicao}
             ORDER BY e.criado_em DESC
             LIMIT ? OFFSET ?`,
            [...parametros, limite, offset]
        );

        return res.status(200).json({
            sucesso: true,
            total: entregas.length,
            pagina,
            limite,
            entregas
        });

    } catch (erro) {
        console.error('Erro ao listar entregas:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar entregas.'
        });
    }
};

// ============================================
// 3. BUSCAR ENTREGA POR ID
// GET /api/entregas/:id
// ============================================

exports.buscarPorId = async (req, res) => {
    try {
        const usuario = obterUsuario(req);
        const { id } = req.params;

        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Autenticação necessária.'
            });
        }

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID da entrega inválido.'
            });
        }

        const [entregas] = await mysql.execute(
            `SELECT *
             FROM entregas
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (entregas.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Entrega não encontrada.'
            });
        }

        const entrega = entregas[0];

        if (!(await verificarAcesso(req, entrega))) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Não tem autorização para consultar esta entrega.'
            });
        }

        const [historico] = await mysql.execute(
            `SELECT
                id,
                estado,
                alterado_por,
                observacao,
                criado_em
             FROM historico_entregas
             WHERE entrega_id = ?
             ORDER BY criado_em ASC`,
            [id]
        );

        return res.status(200).json({
            sucesso: true,
            entrega,
            historico
        });

    } catch (erro) {
        console.error('Erro ao consultar entrega:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar entrega.'
        });
    }
};

// ============================================
// 4. ATUALIZAR ESTADO DA ENTREGA
// PATCH /api/entregas/:id/estado
// ============================================

exports.atualizarEstado = async (req, res) => {
    let conexao;

    try {
        const usuario = obterUsuario(req);
        const { id } = req.params;
        const { estado, observacao } = req.body || {};

        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Autenticação necessária.'
            });
        }

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID da entrega inválido.'
            });
        }

        if (!ESTADOS_ENTREGA.includes(estado)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Estado da entrega inválido.'
            });
        }

        if (
            observacao !== undefined &&
            (
                typeof observacao !== 'string' ||
                observacao.length > 500
            )
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Observação inválida.'
            });
        }

        conexao = await mysql.getConnection();
        await conexao.beginTransaction();

        const [entregas] = await conexao.execute(
            `SELECT *
             FROM entregas
             WHERE id = ?
             FOR UPDATE`,
            [id]
        );

        if (entregas.length === 0) {
            await conexao.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Entrega não encontrada.'
            });
        }

        const entrega = entregas[0];

        if (!(await verificarAcesso(req, entrega))) {
            await conexao.rollback();

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Não tem autorização para alterar esta entrega.'
            });
        }

        const estadoAtual = entrega.estado;

        // Cliente só pode cancelar a própria entrega.
        if (usuario.tipo === 'cliente') {
            if (estado !== 'cancelada') {
                await conexao.rollback();

                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'O cliente só pode cancelar a sua entrega.'
                });
            }

            if (!['pendente', 'aceite'].includes(estadoAtual)) {
                await conexao.rollback();

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Esta entrega já não pode ser cancelada.'
                });
            }
        }

        // Motorista só pode atualizar entregas atribuídas a ele.
        if (usuario.tipo === 'motorista') {
            if (!ESTADOS_MOTORISTA.includes(estado)) {
                await conexao.rollback();

                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Estado não permitido para o motorista.'
                });
            }

            const transicoesMotorista = {
                pendente: ['aceite'],
                aceite: ['recolhida'],
                recolhida: ['em_transito'],
                em_transito: ['entregue']
            };

            if (
                !transicoesMotorista[estadoAtual]?.includes(estado)
            ) {
                await conexao.rollback();

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Transição de estado não permitida.'
                });
            }
        }

        // Administrador pode gerir as transições,
        // mas não reabrir uma entrega cancelada ou concluída.
        if (usuario.tipo === 'admin') {
            const transicoesAdmin = {
                pendente: ['aceite', 'cancelada'],
                aceite: ['recolhida', 'cancelada'],
                recolhida: ['em_transito'],
                em_transito: ['entregue']
            };

            if (
                !transicoesAdmin[estadoAtual]?.includes(estado)
            ) {
                await conexao.rollback();

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Transição de estado não permitida.'
                });
            }
        }

        // Atualizar datas automaticamente
        await conexao.execute(
            `UPDATE entregas
             SET
                estado = ?,
                recolhido_em = CASE
                    WHEN ? = 'recolhida' THEN CURRENT_TIMESTAMP
                    ELSE recolhido_em
                END,
                entregue_em = CASE
                    WHEN ? = 'entregue' THEN CURRENT_TIMESTAMP
                    ELSE entregue_em
                END,
                cancelado_em = CASE
                    WHEN ? = 'cancelada' THEN CURRENT_TIMESTAMP
                    ELSE cancelado_em
                END
             WHERE id = ?`,
            [estado, estado, estado, estado, id]
        );

        await registrarHistorico(
            conexao,
            id,
            estado,
            usuario.id,
            observacao || null
        );

        await conexao.commit();

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Estado da entrega atualizado com sucesso.',
            entrega_id: Number(id),
            estado_anterior: estadoAtual,
            estado_atual: estado
        });

    } catch (erro) {
        if (conexao) {
            await conexao.rollback().catch(() => {});
        }

        console.error('Erro ao atualizar estado:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar estado da entrega.'
        });

    } finally {
        if (conexao) conexao.release();
    }
};

// ============================================
// 5. CANCELAR ENTREGA
// PATCH /api/entregas/:id/cancelar
// ============================================

exports.cancelar = async (req, res) => {
    req.body = {
        ...(req.body || {}),
        estado: 'cancelada'
    };

    return exports.atualizarEstado(req, res);
};

// ============================================
// 6. LISTAR HISTÓRICO
// GET /api/entregas/:id/historico
// ============================================

exports.listarHistorico = async (req, res) => {
    try {
        const usuario = obterUsuario(req);
        const { id } = req.params;

        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Autenticação necessária.'
            });
        }

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID da entrega inválido.'
            });
        }

        const [entregas] = await mysql.execute(
            `SELECT *
             FROM entregas
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (entregas.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Entrega não encontrada.'
            });
        }

        if (!(await verificarAcesso(req, entregas[0]))) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Não tem autorização para consultar este histórico.'
            });
        }

        const [historico] = await mysql.execute(
            `SELECT
                id,
                entrega_id,
                estado,
                alterado_por,
                observacao,
                criado_em
             FROM historico_entregas
             WHERE entrega_id = ?
             ORDER BY criado_em ASC`,
            [id]
        );

        return res.status(200).json({
            sucesso: true,
            entrega_id: Number(id),
            total: historico.length,
            historico
        });

    } catch (erro) {
        console.error('Erro ao consultar histórico:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar histórico da entrega.'
        });
    }
};
