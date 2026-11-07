
const db = require('../config/db');

// ============================================
// BWÉ GO
// CONTROLLER: ITENS DOS PEDIDOS
// ============================================

// LISTAR ITENS DE UM PEDIDO
exports.listarItensPedido = async (req, res) => {
    try {
        const { pedido_id } = req.params;
        const usuario_id = req.user.id;

        const [pedido] = await db.execute(
            `SELECT id
             FROM pedidos
             WHERE id = ? AND usuario_id = ?`,
            [pedido_id, usuario_id]
        );

        if (pedido.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        const [itens] = await db.execute(
            `SELECT
                ip.id,
                ip.pedido_id,
                ip.produto_id,
                p.nome AS produto_nome,
                p.imagem_url,
                ip.quantidade,
                ip.preco_unitario,
                ip.subtotal
             FROM itens_pedidos ip
             INNER JOIN produtos p
                ON p.id = ip.produto_id
             WHERE ip.pedido_id = ?
             ORDER BY ip.id DESC`,
            [pedido_id]
        );

        return res.status(200).json({
            sucesso: true,
            total_itens: itens.length,
            itens
        });

    } catch (error) {
        console.error('Erro ao listar itens:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar os itens do pedido.'
        });
    }
};


// ============================================
// ADICIONAR ITEM AO PEDIDO
// ============================================

exports.adicionarItemPedido = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { pedido_id, produto_id, quantidade } = req.body;
        const usuario_id = req.user.id;

        if (
            !pedido_id ||
            !produto_id ||
            !Number.isInteger(Number(quantidade)) ||
            Number(quantidade) <= 0
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Pedido, produto e quantidade válida são obrigatórios.'
            });
        }

        await connection.beginTransaction();

        // Verificar pedido e bloquear durante a transação
        const [pedidos] = await connection.execute(
            `SELECT id, estado
             FROM pedidos
             WHERE id = ? AND usuario_id = ?
             FOR UPDATE`,
            [pedido_id, usuario_id]
        );

        if (pedidos.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pedido não encontrado.'
            });
        }

        if (pedidos[0].estado !== 'pendente') {
            await connection.rollback();

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível alterar um pedido que já foi processado.'
            });
        }

        // Verificar produto e preço atual
        const [produtos] = await connection.execute(
            `SELECT id, nome, preco, ativo
             FROM produtos
             WHERE id = ?
             FOR UPDATE`,
            [produto_id]
        );

        if (
            produtos.length === 0 ||
            produtos[0].ativo !== 1
        ) {
            await connection.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Produto não encontrado ou indisponível.'
            });
        }

        // Verificar estoque
        const [estoques] = await connection.execute(
            `SELECT quantidade
             FROM estoque
             WHERE produto_id = ?
             FOR UPDATE`,
            [produto_id]
        );

        if (
            estoques.length === 0 ||
            Number(estoques[0].quantidade) < Number(quantidade)
        ) {
            await connection.rollback();

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Estoque insuficiente.'
            });
        }

        const preco = Number(produtos[0].preco);
        const qtd = Number(quantidade);

        // Verificar se produto já existe no pedido
        const [itensExistentes] = await connection.execute(
            `SELECT id, quantidade
             FROM itens_pedidos
             WHERE pedido_id = ? AND produto_id = ?
             FOR UPDATE`,
            [pedido_id, produto_id]
        );

        if (itensExistentes.length > 0) {
            const novaQuantidade =
                Number(itensExistentes[0].quantidade) + qtd;

            if (Number(estoques[0].quantidade) < novaQuantidade) {
                await connection.rollback();

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Quantidade superior ao estoque disponível.'
                });
            }

            const subtotal = novaQuantidade * preco;

            await connection.execute(
                `UPDATE itens_pedidos
                 SET quantidade = ?,
                     preco_unitario = ?,
                     subtotal = ?
                 WHERE id = ?`,
                [
                    novaQuantidade,
                    preco,
                    subtotal,
                    itensExistentes[0].id
                ]
            );

        } else {
            const subtotal = qtd * preco;

            await connection.execute(
                `INSERT INTO itens_pedidos
                    (pedido_id, produto_id, quantidade,
                     preco_unitario, subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    pedido_id,
                    produto_id,
                    qtd,
                    preco,
                    subtotal
                ]
            );
        }

        // Atualizar total do pedido
        await connection.execute(
            `UPDATE pedidos
             SET subtotal = (
                 SELECT COALESCE(SUM(subtotal), 0)
                 FROM itens_pedidos
                 WHERE pedido_id = ?
             )
             WHERE id = ?`,
            [pedido_id, pedido_id]
        );

        await connection.commit();

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Produto adicionado ao pedido com sucesso.'
        });

    } catch (error) {
        await connection.rollback();

        console.error('Erro ao adicionar item:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao adicionar produto ao pedido.'
        });

    } finally {
        connection.release();
    }
};


// ============================================
// ATUALIZAR QUANTIDADE
// ============================================

exports.atualizarQuantidadeItem = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;
        const { quantidade } = req.body;
        const usuario_id = req.user.id;

        if (
            !Number.isInteger(Number(quantidade)) ||
            Number(quantidade) <= 0
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Quantidade inválida.'
            });
        }

        await connection.beginTransaction();

        const [itens] = await connection.execute(
            `SELECT
                ip.id,
                ip.pedido_id,
                ip.produto_id,
                p.preco,
                e.quantidade AS estoque_disponivel,
                pe.estado
             FROM itens_pedidos ip
             INNER JOIN pedidos pe
                ON pe.id = ip.pedido_id
             INNER JOIN produtos p
                ON p.id = ip.produto_id
             INNER JOIN estoque e
                ON e.produto_id = ip.produto_id
             WHERE ip.id = ?
               AND pe.usuario_id = ?
             FOR UPDATE`,
            [id, usuario_id]
        );

        if (itens.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Item não encontrado.'
            });
        }

        const item = itens[0];

        if (item.estado !== 'pendente') {
            await connection.rollback();

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Este pedido não pode ser alterado.'
            });
        }

        if (Number(quantidade) > Number(item.estoque_disponivel)) {
            await connection.rollback();

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Estoque insuficiente.'
            });
        }

        const subtotal =
            Number(quantidade) * Number(item.preco);

        await connection.execute(
            `UPDATE itens_pedidos
             SET quantidade = ?,
                 preco_unitario = ?,
                 subtotal = ?
             WHERE id = ?`,
            [
                Number(quantidade),
                Number(item.preco),
                subtotal,
                id
            ]
        );

        await connection.execute(
            `UPDATE pedidos
             SET subtotal = (
                 SELECT COALESCE(SUM(subtotal), 0)
                 FROM itens_pedidos
                 WHERE pedido_id = ?
             )
             WHERE id = ?`,
            [item.pedido_id, item.pedido_id]
        );

        await connection.commit();

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Quantidade atualizada com sucesso.'
        });

    } catch (error) {
        await connection.rollback();

        console.error('Erro ao atualizar quantidade:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar quantidade.'
        });

    } finally {
        connection.release();
    }
};


// ============================================
// REMOVER ITEM DO PEDIDO
// ============================================

exports.removerItemPedido = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;
        const usuario_id = req.user.id;

        await connection.beginTransaction();

        const [itens] = await connection.execute(
            `SELECT
                ip.id,
                ip.pedido_id,
                pe.estado
             FROM itens_pedidos ip
             INNER JOIN pedidos pe
                ON pe.id = ip.pedido_id
             WHERE ip.id = ?
               AND pe.usuario_id = ?
             FOR UPDATE`,
            [id, usuario_id]
        );

        if (itens.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Item não encontrado.'
            });
        }

        const item = itens[0];

        if (item.estado !== 'pendente') {
            await connection.rollback();

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível remover este item.'
            });
        }

        await connection.execute(
            `DELETE FROM itens_pedidos
             WHERE id = ?`,
            [id]
        );

        await connection.execute(
            `UPDATE pedidos
             SET subtotal = (
                 SELECT COALESCE(SUM(subtotal), 0)
                 FROM itens_pedidos
                 WHERE pedido_id = ?
             )
             WHERE id = ?`,
            [item.pedido_id, item.pedido_id]
        );

        await connection.commit();

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Item removido com sucesso.'
        });

    } catch (error) {
        await connection.rollback();

        console.error('Erro ao remover item:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao remover item do pedido.'
        });

    } finally {
        connection.release();
    }
};
