
const db = require('../config/db');

// ============================================
// BWÉ GO
// CONTROLLER: PAGAMENTOS
// Moeda: AOA (Kwanza Angolano)
// ============================================


// ============================================
// REGISTAR PAGAMENTO
// ============================================

exports.registarPagamento = async (req, res) => {
    try {
        const {
            pedido_id,
            viagem_id,
            entrega_id,
            metodo
        } = req.body;

        const cliente_id = req.user.id;

        const destinos = [
            pedido_id,
            viagem_id,
            entrega_id
        ].filter(valor => valor !== undefined && valor !== null);

        if (destinos.length !== 1) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Indique apenas um pedido, viagem ou entrega.'
            });
        }

        const metodosPermitidos = [
            'dinheiro',
            'multicaixa',
            'transferencia',
            'carteira',
            'online'
        ];

        if (!metodosPermitidos.includes(metodo)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Método de pagamento inválido.'
            });
        }

        let valor = 0;

        // ========================================
        // PAGAMENTO DE PEDIDO
        // ========================================

        if (pedido_id) {
            const [pedidos] = await db.execute(
                `SELECT id, subtotal, estado
                 FROM pedidos
                 WHERE id = ? AND usuario_id = ?`,
                [pedido_id, cliente_id]
            );

            if (pedidos.length === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Pedido não encontrado.'
                });
            }

            if (pedidos[0].estado !== 'pendente') {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'O pedido não está disponível para pagamento.'
                });
            }

            valor = Number(pedidos[0].subtotal);
        }

        // ========================================
        // PAGAMENTO DE VIAGEM
        // ========================================

        if (viagem_id) {
            const [viagens] = await db.execute(
                `SELECT id, valor
                 FROM viagens
                 WHERE id = ? AND usuario_id = ?`,
                [viagem_id, cliente_id]
            );

            if (viagens.length === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Viagem não encontrada.'
                });
            }

            valor = Number(viagens[0].valor);
        }

        // ========================================
        // PAGAMENTO DE ENTREGA
        // ========================================

        if (entrega_id) {
            const [entregas] = await db.execute(
                `SELECT id, valor
                 FROM entregas
                 WHERE id = ? AND usuario_id = ?`,
                [entrega_id, cliente_id]
            );

            if (entregas.length === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Entrega não encontrada.'
                });
            }

            valor = Number(entregas[0].valor);
        }

        if (!Number.isFinite(valor) || valor <= 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Valor de pagamento inválido.'
            });
        }

        const [resultado] = await db.execute(
            `INSERT INTO pagamentos (
                cliente_id,
                pedido_id,
                viagem_id,
                entrega_id,
                valor,
                moeda,
                metodo,
                estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cliente_id,
                pedido_id || null,
                viagem_id || null,
                entrega_id || null,
                valor,
                'AOA',
                metodo,
                'pendente'
            ]
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Pagamento registado com sucesso.',
            pagamento_id: resultado.insertId,
            valor,
            moeda: 'AOA',
            estado: 'pendente'
        });

    } catch (error) {
        console.error('Erro ao registar pagamento:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao registar pagamento.'
        });
    }
};


// ============================================
// LISTAR PAGAMENTOS DO CLIENTE
// ============================================

exports.listarPagamentos = async (req, res) => {
    try {
        const cliente_id = req.user.id;

        const {
            estado,
            metodo
        } = req.query;

        let sql = `
            SELECT
                id,
                cliente_id,
                pedido_id,
                viagem_id,
                entrega_id,
                valor,
                moeda,
                metodo,
                estado,
                referencia,
                criado_em,
                atualizado_em
            FROM pagamentos
            WHERE cliente_id = ?
        `;

        const valores = [cliente_id];

        if (estado) {
            sql += ` AND estado = ?`;
            valores.push(estado);
        }

        if (metodo) {
            sql += ` AND metodo = ?`;
            valores.push(metodo);
        }

        sql += ` ORDER BY criado_em DESC`;

        const [pagamentos] = await db.execute(sql, valores);

        return res.status(200).json({
            sucesso: true,
            total: pagamentos.length,
            pagamentos
        });

    } catch (error) {
        console.error('Erro ao listar pagamentos:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar pagamentos.'
        });
    }
};


// ============================================
// CONSULTAR PAGAMENTO POR ID
// ============================================

exports.buscarPagamentoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const cliente_id = req.user.id;

        const [pagamentos] = await db.execute(
            `SELECT *
             FROM pagamentos
             WHERE id = ? AND cliente_id = ?`,
            [id, cliente_id]
        );

        if (pagamentos.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pagamento não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            pagamento: pagamentos[0]
        });

    } catch (error) {
        console.error('Erro ao consultar pagamento:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar pagamento.'
        });
    }
};


// ============================================
// CONFIRMAR PAGAMENTO
// Esta função deve ser chamada por um webhook
// autenticado do provedor de pagamento.
// ============================================

exports.confirmarPagamento = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;
        const { referencia } = req.body;

        if (!referencia) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Referência do pagamento obrigatória.'
            });
        }

        await connection.beginTransaction();

        const [pagamentos] = await connection.execute(
            `SELECT id, estado
             FROM pagamentos
             WHERE id = ?
             FOR UPDATE`,
            [id]
        );

        if (pagamentos.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Pagamento não encontrado.'
            });
        }

        if (pagamentos[0].estado === 'pago') {
            await connection.rollback();

            return res.status(200).json({
                sucesso: true,
                mensagem: 'Pagamento já confirmado.'
            });
        }

        if (pagamentos[0].estado !== 'pendente') {
            await connection.rollback();

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Este pagamento não pode ser confirmado.'
            });
        }

        await connection.execute(
            `UPDATE pagamentos
             SET estado = 'pago',
                 referencia = ?
             WHERE id = ?`,
            [referencia, id]
        );

        await connection.commit();

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pagamento confirmado com sucesso.'
        });

    } catch (error) {
        await connection.rollback();

        console.error('Erro ao confirmar pagamento:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao confirmar pagamento.'
        });

    } finally {
        connection.release();
    }
};


// ============================================
// CANCELAR PAGAMENTO
// ============================================

exports.cancelarPagamento = async (req, res) => {
    try {
        const { id } = req.params;
        const cliente_id = req.user.id;

        const [resultado] = await db.execute(
            `UPDATE pagamentos
             SET estado = 'cancelado'
             WHERE id = ?
               AND cliente_id = ?
               AND estado = 'pendente'`,
            [id, cliente_id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Pagamento não encontrado ou não pode ser cancelado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Pagamento cancelado com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao cancelar pagamento:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cancelar pagamento.'
        });
    }
};
