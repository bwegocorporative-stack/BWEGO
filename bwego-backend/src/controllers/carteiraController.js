const db = require('../config/db');
const {
    gerarReferenciaPagamento,
    gerarReferenciaTransferencia
} = require('../utils/gerarReferencia');

const METODOS_PAGAMENTO = [
    {
        id: 'multicaixa_express',
        nome: 'Multicaixa Express',
        descricao: 'Pagamento por confirmação do serviço.',
        icon: 'phone-portrait-outline'
    },
    {
        id: 'transferencia',
        nome: 'Transferência bancária',
        descricao: 'Recarga sujeita a confirmação.',
        icon: 'business-outline'
    },
    {
        id: 'cartao',
        nome: 'Cartão bancário',
        descricao: 'Pagamento sujeito a confirmação.',
        icon: 'card-outline'
    }
];

const VALOR_MAXIMO = 9999999999.99;

function valorEmCentimos(valor) {
    const [unidades, decimais = ''] = String(valor).split('.');
    return BigInt(unidades) * 100n + BigInt(decimais.padEnd(2, '0'));
}

function formatarCentimos(valor) {
    const unidades = valor / 100n;
    const decimais = String(valor % 100n).padStart(2, '0');
    return `${unidades}.${decimais}`;
}

function normalizarValor(valor) {
    const texto = String(valor).trim();
    if (
        (typeof valor !== 'string' && typeof valor !== 'number') ||
        texto.length > 13 ||
        !/^\d+(?:\.\d{1,2})?$/.test(texto)
    ) {
        return null;
    }

    const [unidades, decimais = ''] = texto.split('.');
    const centimos = BigInt(unidades) * 100n + BigInt(decimais.padEnd(2, '0'));
    if (centimos <= 0n || centimos > BigInt(Math.round(VALOR_MAXIMO * 100))) {
        return null;
    }

    return formatarCentimos(centimos);
}

async function obterOuCriarCarteira(executor, usuarioId) {
    await executor.execute(
        `INSERT INTO carteiras (usuario_id)
         VALUES (?)
         ON DUPLICATE KEY UPDATE usuario_id = VALUES(usuario_id)`,
        [usuarioId]
    );

    const [carteiras] = await executor.execute(
        `SELECT id, saldo, moeda, estado
         FROM carteiras
         WHERE usuario_id = ?
         LIMIT 1`,
        [usuarioId]
    );

    return carteiras[0];
}

exports.obterCarteira = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const carteira = await obterOuCriarCarteira(db, usuarioId);

        if (carteira.estado !== 'ativa') {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'A carteira não está disponível.'
            });
        }

        const [transacoes] = await db.execute(
            `SELECT
                id,
                pagamento_id,
                tipo,
                valor,
                saldo_anterior,
                saldo_posterior,
                descricao,
                referencia,
                criado_em
             FROM transacoes_carteira
             WHERE carteira_id = ?
             ORDER BY criado_em DESC, id DESC
             LIMIT 100`,
            [carteira.id]
        );

        const [recargasPendentes] = await db.execute(
            `SELECT
                id,
                valor_total AS valor,
                moeda,
                metodo_pagamento AS metodo,
                estado,
                referencia_transacao AS referencia,
                descricao,
                created_at AS criado_em
             FROM pagamentos
             WHERE usuario_id = ?
               AND provedor_pagamento = 'bwego_wallet'
               AND estado IN ('pendente', 'processando')
             ORDER BY created_at DESC, id DESC
             LIMIT 100`,
            [usuarioId]
        );

        const movimentos = [
            ...transacoes.map((transacao) => ({
                id: `transacao-${transacao.id}`,
                tipo: transacao.tipo,
                valor: transacao.valor,
                descricao: transacao.descricao,
                referencia: transacao.referencia,
                estado: 'concluido',
                criado_em: transacao.criado_em,
                saldo_anterior: transacao.saldo_anterior,
                saldo_posterior: transacao.saldo_posterior
            })),
            ...recargasPendentes.map((recarga) => ({
                id: `pagamento-${recarga.id}`,
                tipo: 'recarga',
                valor: recarga.valor,
                moeda: recarga.moeda,
                metodo: recarga.metodo,
                descricao: recarga.descricao,
                referencia: recarga.referencia,
                estado: recarga.estado,
                criado_em: recarga.criado_em
            }))
        ].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

        return res.status(200).json({
            sucesso: true,
            carteira: {
                saldo: carteira.saldo,
                moeda: carteira.moeda
            },
            movimentos,
            metodos: METODOS_PAGAMENTO
        });
    } catch (error) {
        console.error('Erro ao consultar carteira:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível carregar a carteira.'
        });
    }
};

exports.adicionarSaldo = async (req, res) => {
    const valor = normalizarValor(req.body?.valor);
    const metodo = req.body?.metodo;

    if (!valor) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Indique um valor válido, superior a zero, com até duas casas decimais.'
        });
    }

    if (!METODOS_PAGAMENTO.some((item) => item.id === metodo)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Selecione um método de pagamento válido.'
        });
    }

    try {
        const carteira = await obterOuCriarCarteira(db, req.user.id);
        if (carteira.estado !== 'ativa') {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'A carteira não está disponível.'
            });
        }

        const referencia = gerarReferenciaPagamento();
        const [resultado] = await db.execute(
            `INSERT INTO pagamentos (
                codigo_pagamento,
                usuario_id,
                tipo_servico,
                valor,
                valor_total,
                moeda,
                metodo_pagamento,
                estado,
                referencia_transacao,
                provedor_pagamento,
                descricao
             ) VALUES (?, ?, 'outro', ?, ?, ?, ?, 'pendente', ?, 'bwego_wallet', ?)`,
            [
                referencia,
                req.user.id,
                valor,
                valor,
                carteira.moeda,
                metodo,
                referencia,
                'Recarga de carteira'
            ]
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Pedido de recarga criado. O saldo será atualizado após a confirmação do pagamento.',
            pagamento: {
                id: resultado.insertId,
                valor,
                moeda: carteira.moeda,
                metodo,
                estado: 'pendente',
                referencia,
                descricao: 'Recarga de carteira'
            }
        });
    } catch (error) {
        console.error('Erro ao criar recarga da carteira:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível criar o pedido de recarga.'
        });
    }
};

exports.transferirSaldo = async (req, res) => {
    const valor = normalizarValor(req.body?.valor);
    const destinatarioBruto = String(req.body?.destinatario || '').trim();
    const destinatario = destinatarioBruto.includes('@')
        ? destinatarioBruto.toLowerCase()
        : destinatarioBruto.replace(/[\s().-]/g, '');

    if (!valor) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Indique um valor válido, superior a zero, com até duas casas decimais.'
        });
    }

    if (!destinatario || destinatario.length > 190) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Indique o telefone ou email associado à conta de destino.'
        });
    }

    const conexao = await db.getConnection();
    let transacaoIniciada = false;

    try {
        await conexao.beginTransaction();
        transacaoIniciada = true;

        const [destinatarios] = await conexao.execute(
            `SELECT id, nome
             FROM usuarios
             WHERE ativo = 1
               AND (telefone = ? OR email = ?)
             LIMIT 1`,
            [destinatario, destinatario.toLowerCase()]
        );

        if (destinatarios.length === 0) {
            await conexao.rollback();
            transacaoIniciada = false;
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Não foi encontrada uma conta ativa com esse telefone ou email.'
            });
        }

        const contaDestino = destinatarios[0];
        if (String(contaDestino.id) === String(req.user.id)) {
            await conexao.rollback();
            transacaoIniciada = false;
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não podes transferir saldo para a tua própria conta.'
            });
        }

        await obterOuCriarCarteira(conexao, req.user.id);
        await obterOuCriarCarteira(conexao, contaDestino.id);

        const [carteiras] = await conexao.execute(
            `SELECT id, usuario_id, saldo, moeda, estado
             FROM carteiras
             WHERE usuario_id IN (?, ?)
             ORDER BY usuario_id
             FOR UPDATE`,
            [req.user.id, contaDestino.id]
        );
        const carteiraOrigem = carteiras.find(
            (item) => String(item.usuario_id) === String(req.user.id)
        );
        const carteiraDestino = carteiras.find(
            (item) => String(item.usuario_id) === String(contaDestino.id)
        );

        if (
            !carteiraOrigem ||
            !carteiraDestino ||
            carteiraOrigem.estado !== 'ativa' ||
            carteiraDestino.estado !== 'ativa'
        ) {
            await conexao.rollback();
            transacaoIniciada = false;
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Uma das carteiras não está disponível para transferência.'
            });
        }

        if (carteiraOrigem.moeda !== carteiraDestino.moeda) {
            await conexao.rollback();
            transacaoIniciada = false;
            return res.status(400).json({
                sucesso: false,
                mensagem: 'As carteiras têm moedas diferentes e não podem transferir entre si.'
            });
        }

        if (valorEmCentimos(carteiraOrigem.saldo) < valorEmCentimos(valor)) {
            await conexao.rollback();
            transacaoIniciada = false;
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O saldo disponível é insuficiente.'
            });
        }

        const referencia = gerarReferenciaTransferencia();
        const [pagamento] = await conexao.execute(
            `INSERT INTO pagamentos (
                codigo_pagamento,
                usuario_id,
                tipo_servico,
                valor,
                valor_total,
                moeda,
                metodo_pagamento,
                estado,
                referencia_transacao,
                descricao,
                data_pagamento
             ) VALUES (?, ?, 'outro', ?, ?, ?, 'carteira', 'pago', ?, ?, NOW())`,
            [
                referencia,
                req.user.id,
                valor,
                valor,
                carteiraOrigem.moeda,
                referencia,
                `Transferência para ${contaDestino.nome}`
            ]
        );

        const [debito] = await conexao.execute(
            `UPDATE carteiras
             SET saldo = saldo - ?
             WHERE id = ? AND estado = 'ativa' AND saldo >= ?`,
            [valor, carteiraOrigem.id, valor]
        );
        if (debito.affectedRows !== 1) {
            await conexao.rollback();
            transacaoIniciada = false;
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O saldo disponível é insuficiente.'
            });
        }
        await conexao.execute(
            `UPDATE carteiras
             SET saldo = saldo + ?
             WHERE id = ?`,
            [valor, carteiraDestino.id]
        );

        await conexao.execute(
            `INSERT INTO transacoes_carteira (
                carteira_id, pagamento_id, tipo, valor,
                saldo_anterior, saldo_posterior, descricao, referencia
             ) VALUES (?, ?, 'debito', ?, ?, ?, ?, ?)`,
            [
                carteiraOrigem.id,
                pagamento.insertId,
                valor,
                carteiraOrigem.saldo,
                formatarCentimos(
                    valorEmCentimos(carteiraOrigem.saldo) - valorEmCentimos(valor)
                ),
                `Transferência enviada para ${contaDestino.nome}`,
                referencia
            ]
        );
        await conexao.execute(
            `INSERT INTO transacoes_carteira (
                carteira_id, pagamento_id, tipo, valor,
                saldo_anterior, saldo_posterior, descricao, referencia
             ) VALUES (?, ?, 'credito', ?, ?, ?, ?, ?)`,
            [
                carteiraDestino.id,
                pagamento.insertId,
                valor,
                carteiraDestino.saldo,
                formatarCentimos(
                    valorEmCentimos(carteiraDestino.saldo) + valorEmCentimos(valor)
                ),
                'Transferência recebida',
                referencia
            ]
        );

        await conexao.commit();
        transacaoIniciada = false;

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Transferência realizada com sucesso.',
            transferencia: {
                valor,
                moeda: carteiraOrigem.moeda,
                destinatario: contaDestino.nome,
                estado: 'concluido',
                referencia,
                criado_em: new Date().toISOString()
            }
        });
    } catch (error) {
        if (transacaoIniciada) {
            await conexao.rollback();
        }
        console.error('Erro ao transferir saldo da carteira:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível concluir a transferência.'
        });
    } finally {
        conexao.release();
    }
};
