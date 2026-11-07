
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mysql = require('../config/db');

// ========================================
// CONFIGURAÇÕES
// ========================================

const SALT_ROUNDS = 12;

const gerarToken = (usuario) => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET não configurado no .env');
    }

    return jwt.sign(
        {
            id: usuario.id,
            tipo: usuario.tipo
        },
        secret,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    );
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

const normalizarEmail = (email) => {
    if (!email) return null;

    return String(email).trim().toLowerCase();
};

const normalizarTelefone = (telefone) => {
    if (!telefone) return '';

    return String(telefone).replace(/[\s().-]/g, '');
};

const validarEmail = (email) => {
    if (!email) return true;

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validarTelefone = (telefone) => {
    return /^\+?[0-9]{9,15}$/.test(telefone);
};

const validarDataISO = (data) => (
    typeof data === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(data) &&
    !Number.isNaN(Date.parse(`${data}T00:00:00Z`)) &&
    new Date(`${data}T00:00:00Z`).toISOString().slice(0, 10) === data
);

const dadosPublicos = (usuario) => ({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
    tipo: usuario.tipo,
    foto_url: usuario.foto_url || null
});

// ========================================
// 1. REGISTAR UTILIZADOR
// POST /api/auth/registar
// ========================================

exports.registar = async (req, res) => {
    let conexao;

    try {
        const {
            nome,
            email,
            telefone,
            senha,
            confirmarSenha,
            tipo = 'cliente',
            numero_carta_conducao,
            categoria_carta,
            validade_carta,
            numero_bi,
            data_nascimento,
            marca_veiculo,
            modelo_veiculo,
            matricula,
            cor_veiculo,
            ano_veiculo,
            capacidade_passageiros
        } = req.body || {};

        if (!['cliente', 'motorista'].includes(tipo)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O tipo de conta selecionado é inválido.'
            });
        }

        // Validar nome
        if (!nome || typeof nome !== 'string' || !nome.trim()) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O nome é obrigatório.'
            });
        }

        const nomeLimpo = nome.trim();

        if (nomeLimpo.length > 150) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O nome não pode ultrapassar 150 caracteres.'
            });
        }

        // Validar telefone
        const telefoneLimpo = normalizarTelefone(telefone);

        if (!validarTelefone(telefoneLimpo)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Introduza um número de telefone válido.'
            });
        }

        // Validar email
        const emailLimpo = normalizarEmail(email);

        if (emailLimpo && (
            emailLimpo.length > 190 ||
            !validarEmail(emailLimpo)
        )) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Introduza um endereço de email válido.'
            });
        }

        // Validar senha
        if (typeof senha !== 'string' || senha.length < 8) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A senha deve ter pelo menos 8 caracteres.'
            });
        }

        if (Buffer.byteLength(senha, 'utf8') > 72) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A senha não pode ultrapassar 72 bytes.'
            });
        }

        if (
            confirmarSenha !== undefined &&
            senha !== confirmarSenha
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'As senhas não coincidem.'
            });
        }

        let anoVeiculo = null;
        let capacidadePassageiros = 4;

        if (tipo === 'motorista') {
            const camposObrigatorios = {
                numero_carta_conducao,
                categoria_carta,
                numero_bi,
                marca_veiculo,
                modelo_veiculo,
                matricula
            };

            for (const [campo, valor] of Object.entries(camposObrigatorios)) {
                if (typeof valor !== 'string' || !valor.trim()) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: `O campo ${campo} é obrigatório para motoristas.`
                    });
                }
            }

            if (!validarDataISO(validade_carta) || !validarDataISO(data_nascimento)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'As datas do motorista devem estar no formato AAAA-MM-DD.'
                });
            }

            if (ano_veiculo !== undefined && ano_veiculo !== '') {
                anoVeiculo = Number(ano_veiculo);

                if (!Number.isInteger(anoVeiculo) || anoVeiculo < 1901 || anoVeiculo > 2155) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: 'O ano do veículo é inválido.'
                    });
                }
            }

            if (capacidade_passageiros !== undefined && capacidade_passageiros !== '') {
                capacidadePassageiros = Number(capacidade_passageiros);

                if (!Number.isInteger(capacidadePassageiros) || capacidadePassageiros < 1 || capacidadePassageiros > 100) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: 'A capacidade de passageiros é inválida.'
                    });
                }
            }
        }

        const senhaHash = await bcrypt.hash(
            senha,
            SALT_ROUNDS
        );

        conexao = await mysql.getConnection();
        await conexao.beginTransaction();

        // Verificar se telefone ou email já existem
        const [existentes] = await conexao.execute(
            `SELECT id
             FROM usuarios
             WHERE telefone = ?
                OR (? IS NOT NULL AND email = ?)
             LIMIT 1`,
            [
                telefoneLimpo,
                emailLimpo,
                emailLimpo
            ]
        );

        if (existentes.length > 0) {
            await conexao.rollback();
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este email ou telefone já está registado.'
            });
        }

        // Registar utilizador
        // Só são aceites os tipos cliente e motorista; contas privilegiadas
        // nunca são atribuídas pelo formulário público.
        const [resultado] = await conexao.execute(
            `INSERT INTO usuarios (
                nome,
                email,
                telefone,
                senha_hash,
                tipo,
                foto_url,
                foto_public_id,
                ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [
                nomeLimpo,
                emailLimpo,
                telefoneLimpo,
                senhaHash,
                tipo,
                req.file?.path || null,
                req.file?.filename || null
            ]
        );

        if (tipo === 'motorista') {
            await conexao.execute(
                `INSERT INTO motoristas (
                    usuario_id,
                    numero_carta_conducao,
                    categoria_carta,
                    validade_carta,
                    numero_bi,
                    data_nascimento,
                    marca_veiculo,
                    modelo_veiculo,
                    matricula,
                    cor_veiculo,
                    ano_veiculo,
                    capacidade_passageiros,
                    estado_aprovacao,
                    disponibilidade
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', 'offline')`,
                [
                    resultado.insertId,
                    numero_carta_conducao.trim(),
                    categoria_carta.trim(),
                    validade_carta,
                    numero_bi.trim(),
                    data_nascimento,
                    marca_veiculo.trim(),
                    modelo_veiculo.trim(),
                    matricula.trim().toUpperCase(),
                    cor_veiculo?.trim() || null,
                    anoVeiculo,
                    capacidadePassageiros
                ]
            );
        }

        // Consultar utilizador criado
        const [usuarios] = await conexao.execute(
            `SELECT
                id,
                nome,
                email,
                telefone,
                tipo,
                foto_url
             FROM usuarios
             WHERE id = ?
             LIMIT 1`,
            [resultado.insertId]
        );

        const usuario = usuarios[0];

        // Gerar token
        const token = gerarToken(usuario);

        await conexao.commit();

        return res.status(201).json({
            sucesso: true,
            mensagem: tipo === 'motorista'
                ? 'Conta de motorista criada e enviada para aprovação.'
                : 'Conta criada com sucesso.',
            token,
            usuario: dadosPublicos(usuario)
        });

    } catch (erro) {
        if (conexao) {
            try {
                await conexao.rollback();
            } catch (erroRollback) {
                console.error('Erro ao reverter registo:', erroRollback);
            }
        }

        console.error('Erro ao registar utilizador:', erro);

        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este email ou telefone já está registado.'
            });
        }

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível criar a conta.'
        });
    } finally {
        if (conexao) {
            conexao.release();
        }
    }
};

exports.estadoConfiguracaoAdmin = async (req, res) => {
    try {
        const segredo = process.env.ADMIN_SETUP_SECRET;
        const segredoConfigurado =
            typeof segredo === 'string' && Buffer.byteLength(segredo, 'utf8') >= 32;

        const [administradores] = await mysql.execute(
            `SELECT id
             FROM usuarios
             WHERE tipo = 'admin'
             LIMIT 1`
        );

        return res.status(200).json({
            disponivel: administradores.length === 0 && segredoConfigurado,
            administradorExiste: administradores.length > 0,
            configurado: segredoConfigurado
        });
    } catch (erro) {
        console.error('Erro ao verificar configuração inicial do administrador:', erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível verificar a configuração inicial.'
        });
    }
};

exports.registarPrimeiroAdmin = async (req, res) => {
    let conexao;
    let bloqueioAdquirido = false;
    const nomeBloqueio = 'bwego_primeiro_admin';

    try {
        const segredoConfigurado = process.env.ADMIN_SETUP_SECRET;
        const { nome, email, telefone, senha, confirmarSenha, codigoConfiguracao } = req.body || {};

        if (
            typeof segredoConfigurado !== 'string' ||
            Buffer.byteLength(segredoConfigurado, 'utf8') < 32
        ) {
            return res.status(503).json({
                sucesso: false,
                mensagem: 'O cadastro inicial não está configurado no servidor.'
            });
        }

        if (typeof codigoConfiguracao !== 'string') {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Código de configuração inválido.'
            });
        }

        const segredoBuffer = Buffer.from(segredoConfigurado, 'utf8');
        const codigoBuffer = Buffer.from(codigoConfiguracao, 'utf8');
        if (
            segredoBuffer.length !== codigoBuffer.length ||
            !crypto.timingSafeEqual(segredoBuffer, codigoBuffer)
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Código de configuração inválido.'
            });
        }

        const nomeLimpo = typeof nome === 'string' ? nome.trim() : '';
        const emailLimpo = normalizarEmail(email);
        const telefoneLimpo = normalizarTelefone(telefone);

        if (nomeLimpo.length < 2 || nomeLimpo.length > 150) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O nome deve ter entre 2 e 150 caracteres.'
            });
        }
        if (
            !emailLimpo ||
            emailLimpo.length > 190 ||
            !validarEmail(emailLimpo)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Introduza um endereço de email válido.'
            });
        }
        if (!validarTelefone(telefoneLimpo)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Introduza um número de telefone válido.'
            });
        }
        if (
            typeof senha !== 'string' ||
            senha.length < 12 ||
            Buffer.byteLength(senha, 'utf8') > 72
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A senha deve ter pelo menos 12 caracteres e não ultrapassar 72 bytes.'
            });
        }
        if (senha !== confirmarSenha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'As senhas não coincidem.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
        conexao = await mysql.getConnection();
        const [bloqueios] = await conexao.execute(
            'SELECT GET_LOCK(?, 10) AS adquirido',
            [nomeBloqueio]
        );

        if (bloqueios[0]?.adquirido !== 1) {
            return res.status(503).json({
                sucesso: false,
                mensagem: 'Não foi possível iniciar o cadastro. Tente novamente.'
            });
        }
        bloqueioAdquirido = true;

        await conexao.beginTransaction();
        const [administradores] = await conexao.execute(
            `SELECT id
             FROM usuarios
             WHERE tipo = 'admin'
             LIMIT 1
             FOR UPDATE`
        );
        if (administradores.length > 0) {
            await conexao.rollback();
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Já existe um administrador. O cadastro inicial foi encerrado.'
            });
        }

        const [resultado] = await conexao.execute(
            `INSERT INTO usuarios (nome, email, telefone, senha_hash, tipo, ativo)
             VALUES (?, ?, ?, ?, 'admin', TRUE)`,
            [nomeLimpo, emailLimpo, telefoneLimpo, senhaHash]
        );
        const usuario = {
            id: resultado.insertId,
            nome: nomeLimpo,
            email: emailLimpo,
            telefone: telefoneLimpo,
            tipo: 'admin',
            foto_url: null
        };
        const token = gerarToken(usuario);

        await conexao.commit();
        return res.status(201).json({
            sucesso: true,
            mensagem: 'Administrador criado com sucesso.',
            token,
            usuario: dadosPublicos(usuario)
        });
    } catch (erro) {
        if (conexao) {
            try {
                await conexao.rollback();
            } catch (erroRollback) {
                console.error('Erro ao reverter cadastro inicial do administrador:', erroRollback);
            }
        }

        console.error('Erro ao criar primeiro administrador:', erro);
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este email ou telefone já está registado.'
            });
        }
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível criar o administrador.'
        });
    } finally {
        if (conexao) {
            if (bloqueioAdquirido) {
                try {
                    await conexao.execute('SELECT RELEASE_LOCK(?)', [nomeBloqueio]);
                } catch (erroLiberarBloqueio) {
                    console.error('Erro ao libertar bloqueio do cadastro inicial:', erroLiberarBloqueio);
                }
            }
            conexao.release();
        }
    }
};

// ========================================
// 2. LOGIN
// POST /api/auth/login
// ========================================

exports.login = async (req, res) => {
    try {
        const { identificador, email, telefone, senha } = req.body || {};

        const entrada = identificador || email || telefone;

        if (
            !entrada ||
            typeof entrada !== 'string' ||
            !entrada.trim()
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Introduza o email ou telefone.'
            });
        }

        if (!senha || typeof senha !== 'string') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Introduza a sua senha.'
            });
        }

        const valor = entrada.trim();

        const identificadorLimpo = valor.includes('@')
            ? normalizarEmail(valor)
            : normalizarTelefone(valor);

        // Procurar utilizador por email ou telefone
        const [usuarios] = await mysql.execute(
            `SELECT
                id,
                nome,
                email,
                telefone,
                senha_hash,
                tipo,
                foto_url,
                ativo
             FROM usuarios
             WHERE email = ?
                OR telefone = ?
             LIMIT 1`,
            [
                identificadorLimpo,
                identificadorLimpo
            ]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Credenciais inválidas.'
            });
        }

        const usuario = usuarios[0];

        // Verificar senha
        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha_hash
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Credenciais inválidas.'
            });
        }

        // Verificar estado da conta
        if (!usuario.ativo) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Esta conta encontra-se desativada.'
            });
        }

        // Atualizar último login
        await mysql.execute(
            `UPDATE usuarios
             SET ultimo_login = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [usuario.id]
        );

        // Gerar JWT
        const token = gerarToken(usuario);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Login realizado com sucesso.',
            token,
            usuario: dadosPublicos(usuario)
        });

    } catch (erro) {
        console.error('Erro no login:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível realizar o login.'
        });
    }
};
