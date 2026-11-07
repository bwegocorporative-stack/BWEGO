const mysql = require('../config/db');
const bcrypt = require('bcryptjs');

exports.obterDashboard = async (_req, res) => {
    try {
        const [linhas] = await mysql.execute(
            `SELECT
                (SELECT COUNT(*) FROM usuarios WHERE tipo = 'cliente') AS clientes,
                (SELECT COUNT(*) FROM motoristas) AS motoristas,
                (SELECT COUNT(*) FROM motoristas WHERE estado_aprovacao = 'pendente') AS motoristas_pendentes,
                (SELECT COUNT(*) FROM parceiros) AS parceiros,
                (SELECT COUNT(*) FROM parceiros WHERE tipo_empresa = 'farmacia') AS farmacias,
                (SELECT COUNT(*) FROM produtos) AS produtos,
                (SELECT COUNT(*) FROM viagens) AS viagens,
                (SELECT COUNT(*) FROM pedidos) AS pedidos,
                (SELECT COUNT(*) FROM pagamentos) AS pagamentos,
                (SELECT COALESCE(SUM(valor_total), 0)
                 FROM pagamentos
                 WHERE estado = 'pago') AS volume_pago,
                (SELECT COUNT(*) FROM viagens
                 WHERE estado IN (
                    'pendente',
                    'procurando_motorista',
                    'aceite',
                    'motorista_a_caminho',
                    'motorista_chegou',
                    'em_andamento'
                 )) AS viagens_ativas`
        );
        const [viagensPorMes] = await mysql.execute(
            `SELECT
                DATE_FORMAT(data_solicitacao, '%Y-%m') AS mes,
                COUNT(*) AS total
             FROM viagens
             WHERE data_solicitacao >= DATE_FORMAT(
                DATE_SUB(CURDATE(), INTERVAL 5 MONTH),
                '%Y-%m-01'
             )
             GROUP BY DATE_FORMAT(data_solicitacao, '%Y-%m')
             ORDER BY mes`
        );
        const [pagamentosPorMes] = await mysql.execute(
            `SELECT
                DATE_FORMAT(created_at, '%Y-%m') AS mes,
                COALESCE(SUM(CASE WHEN estado = 'pago' THEN valor_total ELSE 0 END), 0) AS total
             FROM pagamentos
             WHERE created_at >= DATE_FORMAT(
                DATE_SUB(CURDATE(), INTERVAL 5 MONTH),
                '%Y-%m-01'
             )
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY mes`
        );

        return res.status(200).json({
            sucesso: true,
            dashboard: {
                ...linhas[0],
                viagens_por_mes: viagensPorMes,
                pagamentos_por_mes: pagamentosPorMes
            }
        });
    } catch (erro) {
        console.error('Erro ao carregar dashboard administrativo:', erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível carregar o dashboard.'
        });
    }
};

exports.listarGestores = async (_req, res) => {
    try {
        const [gestores] = await mysql.execute(
            `SELECT id, nome, email, telefone, ativo, criado_em
             FROM usuarios
             WHERE tipo = 'admin'
             ORDER BY ativo DESC, nome ASC`
        );
        return res.status(200).json({ sucesso: true, gestores });
    } catch (erro) {
        console.error('Erro ao listar gestores:', erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível carregar os gestores.'
        });
    }
};

exports.criarGestor = async (req, res) => {
    const body = req.body || {};
    if (
        typeof body.nome !== 'string' ||
        typeof body.email !== 'string' ||
        typeof body.telefone !== 'string' ||
        typeof body.senha !== 'string' ||
        typeof body.confirmarSenha !== 'string'
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Preenche nome, email, telefone e palavra-passe.'
        });
    }

    const { dados, erro } = normalizarDadosContacto(body);
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });
    if (!dados.email || !dados.telefone) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Email e telefone são obrigatórios para criar um gestor.'
        });
    }
    if (
        body.senha.length < 12 ||
        Buffer.byteLength(body.senha, 'utf8') > 72
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'A palavra-passe deve ter pelo menos 12 caracteres e não ultrapassar 72 bytes.'
        });
    }
    if (body.senha !== body.confirmarSenha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'As palavras-passe não coincidem.'
        });
    }

    try {
        const senhaHash = await bcrypt.hash(body.senha, 12);
        const [resultado] = await mysql.execute(
            `INSERT INTO usuarios (nome, email, telefone, senha_hash, tipo, ativo)
             VALUES (?, ?, ?, ?, 'admin', TRUE)`,
            [dados.nome, dados.email, dados.telefone, senhaHash]
        );
        return res.status(201).json({
            sucesso: true,
            mensagem: 'Gestor criado com sucesso.',
            gestor: {
                id: resultado.insertId,
                nome: dados.nome,
                email: dados.email,
                telefone: dados.telefone,
                ativo: 1
            }
        });
    } catch (erroCriacao) {
        console.error('Erro ao criar gestor:', erroCriacao);
        if (erroCriacao.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este email ou telefone já está associado a uma conta.'
            });
        }
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível criar o gestor.'
        });
    }
};

exports.removerGestor = async (req, res) => {
    const id = Number(req.params.id);
    const administradorId = Number(req.user?.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'ID do gestor inválido.'
        });
    }
    if (id === administradorId) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Não podes remover a tua própria conta de gestor.'
        });
    }

    let conexao;
    try {
        conexao = await mysql.getConnection();
        await conexao.beginTransaction();
        const [gestoresAtivos] = await conexao.execute(
            `SELECT id
             FROM usuarios
             WHERE tipo = 'admin' AND ativo = TRUE
             FOR UPDATE`
        );
        if (!gestoresAtivos.some((gestor) => Number(gestor.id) === id)) {
            await conexao.rollback();
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Gestor ativo não encontrado.'
            });
        }
        if (gestoresAtivos.length <= 1) {
            await conexao.rollback();
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Não é possível remover o último gestor ativo.'
            });
        }

        await conexao.execute(
            `UPDATE usuarios
             SET ativo = FALSE
             WHERE id = ? AND tipo = 'admin' AND ativo = TRUE`,
            [id]
        );
        await conexao.commit();
        return res.status(200).json({
            sucesso: true,
            mensagem: 'Gestor removido com sucesso.'
        });
    } catch (erroRemocao) {
        if (conexao) {
            try {
                await conexao.rollback();
            } catch (erroRollback) {
                console.error('Erro ao reverter remoção de gestor:', erroRollback);
            }
        }
        console.error('Erro ao remover gestor:', erroRemocao);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível remover o gestor.'
        });
    } finally {
        if (conexao) conexao.release();
    }
};

const CAMPOS_CONTACTO = ['nome', 'email', 'telefone'];

const normalizarDadosContacto = (body) => {
    const dados = {};
    for (const campo of CAMPOS_CONTACTO) {
        if (body[campo] === undefined) continue;
        if (typeof body[campo] !== 'string') {
            return { erro: `O campo ${campo} deve ser texto.` };
        }
        const valor = body[campo].trim();
        if (campo === 'nome' && (valor.length < 2 || valor.length > 150)) {
            return { erro: 'O nome deve ter entre 2 e 150 caracteres.' };
        }
        if (campo === 'email') {
            const email = valor.toLowerCase();
            if (email && (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
                return { erro: 'O email não é válido.' };
            }
            dados.email = email || null;
            continue;
        }
        if (campo === 'telefone') {
            const telefone = valor.replace(/[\s().-]/g, '');
            if (!/^\+?[0-9]{9,15}$/.test(telefone)) {
                return { erro: 'O telefone não é válido.' };
            }
            dados.telefone = telefone;
            continue;
        }
        dados[campo] = valor;
    }
    return { dados };
};

const atualizarCamposPermitidos = async (conexao, tabela, dados, id) => {
    const campos = Object.keys(dados);
    if (!campos.length) return false;
    const atribuicoes = campos.map((campo) => `${campo} = ?`).join(', ');
    const [resultado] = await conexao.execute(
        `UPDATE ${tabela} SET ${atribuicoes} WHERE id = ?`,
        [...campos.map((campo) => dados[campo]), id]
    );
    return resultado.affectedRows > 0;
};

exports.atualizarCliente = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ sucesso: false, mensagem: 'ID do cliente inválido.' });
    }
    const { dados, erro } = normalizarDadosContacto(req.body || {});
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });
    if (!Object.keys(dados).length) {
        return res.status(400).json({ sucesso: false, mensagem: 'Indica pelo menos um campo para atualizar.' });
    }

    try {
        const [resultado] = await mysql.execute(
            `UPDATE usuarios
             SET ${Object.keys(dados).map((campo) => `${campo} = ?`).join(', ')}
             WHERE id = ? AND tipo = 'cliente'`,
            [...Object.keys(dados).map((campo) => dados[campo]), id]
        );
        if (!resultado.affectedRows) {
            const [existente] = await mysql.execute(
                `SELECT id FROM usuarios WHERE id = ? AND tipo = 'cliente' LIMIT 1`,
                [id]
            );
            if (!existente.length) {
                return res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado.' });
            }
        }
        return res.status(200).json({ sucesso: true, mensagem: 'Dados do cliente atualizados.' });
    } catch (erroAtualizacao) {
        console.error('Erro ao atualizar cliente na administração:', erroAtualizacao);
        if (erroAtualizacao.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ sucesso: false, mensagem: 'O email ou telefone já está associado a outra conta.' });
        }
        return res.status(500).json({ sucesso: false, mensagem: 'Não foi possível atualizar o cliente.' });
    }
};

exports.atualizarMotorista = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ sucesso: false, mensagem: 'ID do motorista inválido.' });
    }
    const body = req.body || {};
    const contacto = {};
    for (const campo of CAMPOS_CONTACTO) {
        if (body[campo] !== undefined) contacto[campo] = body[campo];
    }
    const { dados: dadosContacto, erro } = normalizarDadosContacto(contacto);
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });

    const camposMotorista = [
        'numero_carta_conducao', 'categoria_carta', 'validade_carta',
        'numero_bi', 'marca_veiculo', 'modelo_veiculo', 'matricula', 'cor_veiculo'
    ];
    const dadosMotorista = {};
    for (const campo of camposMotorista) {
        if (body[campo] === undefined) continue;
        if (typeof body[campo] !== 'string') {
            return res.status(400).json({ sucesso: false, mensagem: `O campo ${campo} deve ser texto.` });
        }
        const valor = body[campo].trim();
        if (campo !== 'cor_veiculo' && !valor) {
            return res.status(400).json({ sucesso: false, mensagem: `O campo ${campo} é obrigatório.` });
        }
        dadosMotorista[campo] = campo === 'matricula' ? valor.toUpperCase() : (valor || null);
    }
    if (body.ano_veiculo !== undefined) {
        const ano = Number(body.ano_veiculo);
        if (body.ano_veiculo !== '' && (!Number.isInteger(ano) || ano < 1901 || ano > 2155)) {
            return res.status(400).json({ sucesso: false, mensagem: 'Ano do veículo inválido.' });
        }
        dadosMotorista.ano_veiculo = body.ano_veiculo === '' ? null : ano;
    }
    if (body.capacidade_passageiros !== undefined) {
        const capacidade = Number(body.capacidade_passageiros);
        if (!Number.isInteger(capacidade) || capacidade < 1 || capacidade > 100) {
            return res.status(400).json({ sucesso: false, mensagem: 'Capacidade de passageiros inválida.' });
        }
        dadosMotorista.capacidade_passageiros = capacidade;
    }
    if (body.validade_carta !== undefined &&
        (
            typeof body.validade_carta !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(body.validade_carta) ||
            Number.isNaN(Date.parse(`${body.validade_carta}T00:00:00Z`)) ||
            new Date(`${body.validade_carta}T00:00:00Z`).toISOString().slice(0, 10) !== body.validade_carta
        )) {
        return res.status(400).json({ sucesso: false, mensagem: 'A validade da carta deve estar no formato AAAA-MM-DD.' });
    }
    if (!Object.keys(dadosContacto).length && !Object.keys(dadosMotorista).length) {
        return res.status(400).json({ sucesso: false, mensagem: 'Indica pelo menos um campo para atualizar.' });
    }

    let conexao;
    try {
        conexao = await mysql.getConnection();
        await conexao.beginTransaction();
        const [motoristas] = await conexao.execute(
            `SELECT usuario_id FROM motoristas WHERE id = ? LIMIT 1 FOR UPDATE`,
            [id]
        );
        if (!motoristas.length) {
            await conexao.rollback();
            return res.status(404).json({ sucesso: false, mensagem: 'Motorista não encontrado.' });
        }
        await atualizarCamposPermitidos(conexao, 'usuarios', dadosContacto, motoristas[0].usuario_id);
        await atualizarCamposPermitidos(conexao, 'motoristas', dadosMotorista, id);
        await conexao.commit();
        return res.status(200).json({ sucesso: true, mensagem: 'Dados do motorista atualizados.' });
    } catch (erroAtualizacao) {
        if (conexao) await conexao.rollback();
        console.error('Erro ao atualizar motorista na administração:', erroAtualizacao);
        if (erroAtualizacao.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ sucesso: false, mensagem: 'BI, carta, matrícula, email ou telefone já está associado a outro registo.' });
        }
        return res.status(500).json({ sucesso: false, mensagem: 'Não foi possível atualizar o motorista.' });
    } finally {
        if (conexao) conexao.release();
    }
};

exports.listarClientes = async (req, res) => {
    const pagina = req.query.pagina === undefined
        ? 1
        : Number(req.query.pagina);
    const limite = req.query.limite === undefined
        ? 25
        : Number(req.query.limite);

    if (
        !Number.isInteger(pagina) ||
        !Number.isInteger(limite) ||
        pagina < 1 ||
        limite < 1 ||
        limite > 100
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'A página deve ser positiva e o limite deve estar entre 1 e 100.'
        });
    }

    const pesquisa = typeof req.query.pesquisa === 'string'
        ? req.query.pesquisa.trim()
        : '';
    const offset = (pagina - 1) * limite;

    try {
        const filtro = pesquisa
            ? `AND (nome LIKE ? OR email LIKE ? OR telefone LIKE ?)`
            : '';
        const parametros = pesquisa
            ? [`%${pesquisa}%`, `%${pesquisa}%`, `%${pesquisa}%`]
            : [];
        const [clientes] = await mysql.execute(
            `SELECT id, nome, email, telefone, foto_url, ativo, criado_em
             FROM usuarios
             WHERE tipo = 'cliente' ${filtro}
             ORDER BY criado_em DESC
             LIMIT ? OFFSET ?`,
            [...parametros, limite, offset]
        );

        return res.status(200).json({
            sucesso: true,
            pagina,
            limite,
            clientes
        });
    } catch (erro) {
        console.error('Erro ao listar clientes para administração:', erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível carregar os clientes.'
        });
    }
};
