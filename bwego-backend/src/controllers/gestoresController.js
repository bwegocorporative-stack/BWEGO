const bcrypt = require('bcryptjs');
const db = require('../config/db');
const cloudinary = require('../config/cloudinary');

const normalizarContato = (body) => {
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const telefone = typeof body.telefone === 'string'
        ? body.telefone.replace(/[\s().-]/g, '')
        : '';
    const funcao = typeof body.funcao === 'string' ? body.funcao.trim() : '';

    if (nome.length < 2 || nome.length > 150) {
        return { erro: 'O nome deve ter entre 2 e 150 caracteres.' };
    }
    if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { erro: 'O email não é válido.' };
    }
    if (!/^\+?[0-9]{9,15}$/.test(telefone)) {
        return { erro: 'O telefone não é válido.' };
    }
    if (!funcao || funcao.length > 120) {
        return { erro: 'A função é obrigatória e deve ter até 120 caracteres.' };
    }
    return { dados: { nome, email, telefone, funcao } };
};

exports.listar = async (_req, res) => {
    try {
        const [gestores] = await db.execute(
            `SELECT id, nome, email, telefone, funcao, foto_url, ativo, criado_em
             FROM gestores
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

exports.criar = async (req, res) => {
    const { dados, erro } = normalizarContato(req.body || {});
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });
    if (!req.file?.path || !req.file?.filename) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Seleciona uma foto para o gestor.'
        });
    }

    const senha = req.body?.senha;
    const confirmarSenha = req.body?.confirmarSenha;
    if (
        typeof senha !== 'string' ||
        senha.length < 8 ||
        Buffer.byteLength(senha, 'utf8') > 72
    ) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'A palavra-passe deve ter pelo menos 8 caracteres e não ultrapassar 72 bytes.'
        });
    }
    if (senha !== confirmarSenha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'As palavras-passe não coincidem.'
        });
    }

    try {
        const [duplicados] = await db.execute(
            `SELECT email AS identificador FROM usuarios WHERE email = ? OR telefone = ?
             UNION ALL
             SELECT email AS identificador FROM gestores WHERE email = ? OR telefone = ?
             LIMIT 1`,
            [dados.email, dados.telefone, dados.email, dados.telefone]
        );
        if (duplicados.length) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este email ou telefone já está associado a uma conta.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 12);
        const [resultado] = await db.execute(
            `INSERT INTO gestores (nome, email, telefone, funcao, foto_url, foto_public_id, senha_hash, ativo)
             VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [
                dados.nome,
                dados.email,
                dados.telefone,
                dados.funcao,
                req.file.path,
                req.file.filename,
                senhaHash
            ]
        );
        return res.status(201).json({
            sucesso: true,
            mensagem: 'Gestor criado com sucesso.',
            gestor: {
                id: resultado.insertId,
                ...dados,
                foto_url: req.file.path,
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

exports.atualizar = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ sucesso: false, mensagem: 'ID do gestor inválido.' });
    }

    const { dados, erro } = normalizarContato(req.body || {});
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });

    try {
        const [gestores] = await db.execute(
            'SELECT foto_public_id FROM gestores WHERE id = ? AND ativo = TRUE LIMIT 1',
            [id]
        );
        if (!gestores.length) {
            return res.status(404).json({ sucesso: false, mensagem: 'Gestor não encontrado.' });
        }

        const [duplicados] = await db.execute(
            `SELECT id FROM usuarios WHERE (email = ? OR telefone = ?)
             UNION ALL
             SELECT id FROM gestores WHERE id <> ? AND (email = ? OR telefone = ?)
             LIMIT 1`,
            [dados.email, dados.telefone, id, dados.email, dados.telefone]
        );
        if (duplicados.length) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este email ou telefone já está associado a outra conta.'
            });
        }

        const campos = ['nome = ?', 'email = ?', 'telefone = ?', 'funcao = ?'];
        const valores = [dados.nome, dados.email, dados.telefone, dados.funcao];
        if (req.file?.path && req.file?.filename) {
            campos.push('foto_url = ?', 'foto_public_id = ?');
            valores.push(req.file.path, req.file.filename);
        }
        valores.push(id);
        await db.execute(
            `UPDATE gestores SET ${campos.join(', ')} WHERE id = ? AND ativo = TRUE`,
            valores
        );

        if (req.file?.filename && gestores[0].foto_public_id) {
            try {
                await cloudinary.uploader.destroy(gestores[0].foto_public_id);
            } catch (erroImagem) {
                console.error('Erro ao remover foto anterior do gestor:', erroImagem);
            }
        }
        return res.status(200).json({
            sucesso: true,
            mensagem: 'Gestor atualizado com sucesso.'
        });
    } catch (erroAtualizacao) {
        console.error('Erro ao atualizar gestor:', erroAtualizacao);
        if (erroAtualizacao.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este email ou telefone já está associado a outra conta.'
            });
        }
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível atualizar o gestor.'
        });
    }
};

exports.remover = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ sucesso: false, mensagem: 'ID do gestor inválido.' });
    }
    try {
        const [gestores] = await db.execute(
            'SELECT foto_public_id FROM gestores WHERE id = ? AND ativo = TRUE LIMIT 1',
            [id]
        );
        if (!gestores.length) {
            return res.status(404).json({ sucesso: false, mensagem: 'Gestor ativo não encontrado.' });
        }
        const [resultado] = await db.execute(
            'UPDATE gestores SET ativo = FALSE WHERE id = ? AND ativo = TRUE',
            [id]
        );
        if (!resultado.affectedRows) {
            return res.status(404).json({ sucesso: false, mensagem: 'Gestor ativo não encontrado.' });
        }
        if (gestores[0].foto_public_id) {
            try {
                await cloudinary.uploader.destroy(gestores[0].foto_public_id);
            } catch (erroImagem) {
                console.error('Erro ao remover foto do gestor:', erroImagem);
            }
        }
        return res.status(200).json({ sucesso: true, mensagem: 'Gestor removido com sucesso.' });
    } catch (erro) {
        console.error('Erro ao remover gestor:', erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível remover o gestor.'
        });
    }
};

exports.autenticar = async (identificador, senha) => {
    const [gestores] = await db.execute(
        `SELECT id, nome, email, telefone, funcao, foto_url, senha_hash, ativo
         FROM gestores
         WHERE email = ? OR telefone = ?
         LIMIT 1`,
        [identificador, identificador]
    );
    if (!gestores.length) return null;

    const gestor = gestores[0];
    if (!gestor.ativo || !(await bcrypt.compare(senha, gestor.senha_hash))) {
        return { invalido: true };
    }
    await db.execute(
        'UPDATE gestores SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?',
        [gestor.id]
    );
    return {
        id: gestor.id,
        nome: gestor.nome,
        email: gestor.email,
        telefone: gestor.telefone,
        funcao: gestor.funcao,
        foto_url: gestor.foto_url,
        tipo: 'gestor'
    };
};
