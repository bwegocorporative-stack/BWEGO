
const db = require('../config/db');

// ============================================
// BWÉ GO
// CONTROLLER: PEDIDOS
// ============================================

// ============================================
// 1. CRIAR PEDIDO
// ============================================
exports.criarPedido = async (req, res) => {
    const conexao = await db.getConnection();

    try {
        const {
            usuario_id,
            parceiro_id,
            tipo_entrega,
            endereco_entrega,
            latitude_entrega,
            longitude_entrega,
            observacoes,
            itens
        } = req.body;

        if (!usuario_id || !parceiro_id || !Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe o utilizador, parceiro e os produtos do pedido.'
            });
        }

        if (!['entrega', 'recolha'].includes(tipo_entrega)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Tipo de entrega inválido.'
            });
        }

        if (tipo_entrega === 'entrega' && !endereco_entrega) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O endereço de entrega é obrigatório.'
            });
        }

        await conexao.beginTransaction();

        // Verificar parceiro
        const [parceiros] = await conexao.execute(
            `SELECT id, estado_aprovacao, aceita_entregas,
                    aceita_recolha_local
             FROM parceiros
             WHERE id = ?`,
            [parceiro_id]
        );

        if (!parceiros.length || parceiros[0].estado_aprovacao !== 'aprovado') {
            throw new Error('Parceiro não encontrado ou não aprovado.');
        }

        const parceiro = parceiros[0];

        if (tipo_entrega === 'entrega' && !parceiro.aceita_entregas) {
            throw new Error('Este parceiro não aceita entregas.');
        }

        if (tipo_entrega === 'recolha' && !parceiro.aceita_recolha_local) {
            throw new Error('Este parceiro não aceita recolha local.');
        }

        let subtotal = 0;
        const produtosProcessados = [];

        // Validar produtos e calcular valores no servidor
        for (const item of itens) {
            const produtoId = Number(item.produto_id);
            const quantidade = Number(item.quantidade);

            if (!Number.isInteger(produtoId) || produtoId <= 0 ||
                !Number.isInteger(quantidade) || quantidade <= 0) {
                throw new Error('Produto ou quantidade inválida.');
            }

            const [produtos] = await conexao.execute(
                `SELECT id, nome, preco, parceiro_id, estado
                 FROM produtos
                 WHERE id = ?
                 FOR UPDATE`,
                [produtoId]
            );

            if (!produtos.length) {
                throw new Error(`Produto ${produtoId} não encontrado.`);
            }

            const produto = produtos[0];

            if (Number(produto.parceiro_id) !== Number(parceiro_id)) {
                throw new Error('Todos os produtos devem pertencer ao mesmo parceiro.');
            }

            if (produto.estado !== 'disponivel') {
                throw new Error(`O produto ${produto.nome} não está disponível.`);
            }

            const preco = Number(produto.preco);
            const total = preco * quantidade;

            subtotal += total;

            produtosProcessados.push({
                produto_id: produto.id,
                quantidade,
                preco_unitario: preco,
                subtotal: total
            });
        }

        // Criar pedido
        const [pedido] = await conexao.execute(
            `INSERT INTO pedidos (
                usuario_id,
                parceiro_id,
                tipo_entrega,
                endereco_entrega,
                latitude_entrega,
                longitude_entrega,
                observacoes,
                subtotal,
                valor_entrega,
                valor_total,
                estado_pedido,
                data_pedido
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                usuario_id,
                parceiro_id,
                tipo_entrega,
                tipo_entrega === 'entrega' ? endereco_entrega : null,
                latitude_entrega || null,
                longitude_entrega || null,
                observacoes || null,
                subtotal,
                0,
                subtotal,
                'pendente'
            ]
        );

        // Inserir itens do pedido
        for (const item of produtosProcessados) {
            await conexao.execute(
                `INSERT INTO itens_pedidos (
                    pedido_id,
                    produto_id,
                    quantidade,
                    preco_unitario,
                    subtotal
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    pedido.insertId,
                    item.produto_id,
                    item.quantidade,
                    item.preco_unitario,
                    item.subtotal
                ]
            );
        }

        await conexao.commit();

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Pedido criado com sucesso!',
            pedido_id: pedido.insertId,
            subtotal,
            valor_total: subtotal,
            itens: produtosProcessados
        });

    } catch (erro) {
        await conexao.rollback();

        return res.status(400).json({
            sucesso: false,
            mensagem: erro.message
        });

    } finally {
        conexao.release();
    }
};


// ============================================
// 2. LISTAR PEDIDOS DO CLIENTE
// ============================================
exports.listarPedidosUsuario = async (req, res) => {
    try {
        const { usuario_id } = req.params;

        const [pedidos] = await db.execute(
            `SELECT p.*, pa.nome_comercial
             FROM pedidos p
             LEFT JOIN parceiros pa ON pa.id = p.parceiro_id
             WHERE p.usuario_id = ?
             ORDER BY p.data_pedido DESC`,
            [usuario_id]
        );

        return res.json({
            sucesso: true,
            total: pedidos.length,
            pedidos
        });

    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar pedidos.',
            erro: erro.message
        });
    }
};


// ============================================
// 3. DETALHES DE UM PEDIDO
// ============================================
exports.detalhesPedido = async (req, res) => {
    try {
        const { id } = req.params;

        const [pedidos] = await db.execute(
            `SELECT p.*, pa.nome_comercial
             FROM pedidos p
             LEFT JOIN parceiros pa ON pa.id = p.parceiro_id
             WHERE p.id = ?`,
            [id]
        );

        if (!pedidos.length) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        const [itens] = await db.execute(
            `SELECT ip.*, pr.nome AS produto_nome
             FROM itens_pedidos ip
             LEFT JOIN produtos pr ON pr.id = ip.produto_id
             WHERE ip.pedido_id = ?`,
            [id]
        );

        return res.json({
            sucesso: true,
            pedido: pedidos[0],
            itens
        });

    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar pedido.',
            erro: erro.message
        });
    }
};


// ============================================
// 4. LISTAR PEDIDOS DO PARCEIRO
// ============================================
exports.listarPedidosParceiro = async (req, res) => {
    try {
        const { parceiro_id } = req.params;

        const [pedidos] = await db.execute(
            `SELECT p.*, u.nome AS cliente_nome
             FROM pedidos p
             LEFT JOIN usuarios u ON u.id = p.usuario_id
             WHERE p.parceiro_id = ?
             ORDER BY p.data_pedido DESC`,
            [parceiro_id]
        );

        return res.json({
            sucesso: true,
            total: pedidos.length,
            pedidos
        });

    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar pedidos do parceiro.',
            erro: erro.message
        });
    }
};


// ============================================
// 5. ACTUALIZAR ESTADO DO PEDIDO
// ============================================
exports.actualizarEstadoPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado_pedido } = req.body;

        const estadosPermitidos = [
            'pendente',
            'confirmado',
            'preparando',
            'pronto',
            'em_entrega',
            'entregue',
            'cancelado'
        ];

        if (!estadosPermitidos.includes(estado_pedido)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Estado do pedido inválido.'
            });
        }

        const [resultado] = await db.execute(
            `UPDATE pedidos
             SET estado_pedido = ?
             WHERE id = ?`,
            [estado_pedido, id]
        );

        if (!resultado.affectedRows) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        return res.json({
            sucesso: true,
            mensagem: 'Estado do pedido actualizado com sucesso.'
        });

    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao actualizar pedido.',
            erro: erro.message
        });
    }
};


// ============================================
// 6. CANCELAR PEDIDO
// ============================================
exports.cancelarPedido = async (req, res) => {
    try {
        const { id } = req.params;

        const [resultado] = await db.execute(
            `UPDATE pedidos
             SET estado_pedido = 'cancelado'
             WHERE id = ?
             AND estado_pedido IN ('pendente', 'confirmado')`,
            [id]
        );

        if (!resultado.affectedRows) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado ou não pode ser cancelado.'
            });
        }

        return res.json({
            sucesso: true,
            mensagem: 'Pedido cancelado com sucesso.'
        });

    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cancelar pedido.',
            erro: erro.message
        });
    }
};
