
const mysql = require('../config/db');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');

// =====================================================
// VALIDAR ID
// =====================================================

const validarId = (id) => {
    return Number.isSafeInteger(Number(id)) && Number(id) > 0
        ? Number(id)
        : null;
};

// =====================================================
// OBTER PERFIL DO UTILIZADOR
// =====================================================

exports.obterPerfil = async (req, res) => {
    try {
        const usuarioId = validarId(req.user?.id);

        if (!usuarioId) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Utilizador não autenticado.'
            });
        }

        const [usuarios] = await mysql.execute(
            `SELECT
                id,
                nome,
                email,
                telefone,
                tipo,
                foto_url,
                email_verificado,
                telefone_verificado,
                ativo,
                criado_em,
                atualizado_em
            FROM usuarios
            WHERE id = ?
            LIMIT 1`,
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Utilizador não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Perfil carregado com sucesso.',
            usuario: usuarios[0]
        });

    } catch (erro) {
        console.error('Erro ao obter perfil:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar perfil.'
        });
    }
};

// =====================================================
// ATUALIZAR DADOS DO UTILIZADOR
// =====================================================

exports.atualizarPerfil = async (req, res) => {
    try {
        const usuarioId = validarId(req.user?.id);

        if (!usuarioId) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Utilizador não autenticado.'
            });
        }

        const {
            nome,
            email,
            telefone
        } = req.body;

        if (
            typeof nome !== 'string' ||
            nome.trim().length < 3
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O nome deve ter pelo menos 3 caracteres.'
            });
        }

        if (
            typeof telefone !== 'string' ||
            telefone.trim().length < 6
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Número de telefone inválido.'
            });
        }

        const nomeFinal = nome.trim();
        const telefoneFinal = telefone.trim();
        const emailFinal = email
            ? String(email).trim().toLowerCase()
            : null;

        if (
            emailFinal &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFinal)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Endereço de email inválido.'
            });
        }

        // Verificar se o utilizador existe
        const [usuarios] = await mysql.execute(
            `SELECT id
             FROM usuarios
             WHERE id = ?
             LIMIT 1`,
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Utilizador não encontrado.'
            });
        }

        // Atualizar informações
        await mysql.execute(
            `UPDATE usuarios
             SET
                nome = ?,
                email = ?,
                telefone = ?
             WHERE id = ?`,
            [
                nomeFinal,
                emailFinal,
                telefoneFinal,
                usuarioId
            ]
        );

        const [resultado] = await mysql.execute(
            `SELECT
                id,
                nome,
                email,
                telefone,
                tipo,
                foto_url,
                email_verificado,
                telefone_verificado,
                ativo,
                criado_em,
                atualizado_em
             FROM usuarios
             WHERE id = ?
             LIMIT 1`,
            [usuarioId]
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Dados atualizados com sucesso.',
            usuario: resultado[0]
        });

    } catch (erro) {
        console.error('Erro ao atualizar perfil:', erro);

        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este email ou telefone já está registado.'
            });
        }

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar os dados.'
        });
    }
};

// =====================================================
// ATUALIZAR FOTO DO UTILIZADOR
// =====================================================

exports.atualizarFotoPerfil = async (req, res) => {
    try {
        const usuarioId = validarId(req.user?.id);

        if (!usuarioId) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Utilizador não autenticado.'
            });
        }

        if (!req.file?.path || !req.file?.filename) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Selecione uma imagem para atualizar a foto.'
            });
        }

        const [usuarios] = await mysql.execute(
            `SELECT foto_public_id
             FROM usuarios
             WHERE id = ?
             LIMIT 1`,
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Utilizador não encontrado.'
            });
        }

        await mysql.execute(
            `UPDATE usuarios
             SET foto_url = ?, foto_public_id = ?
             WHERE id = ?`,
            [req.file.path, req.file.filename, usuarioId]
        );

        const fotoAnteriorId = usuarios[0].foto_public_id;
        if (fotoAnteriorId && fotoAnteriorId !== req.file.filename) {
            try {
                await cloudinary.uploader.destroy(fotoAnteriorId);
            } catch (erro) {
                console.error('Erro ao remover foto de perfil anterior:', erro);
            }
        }

        const [resultado] = await mysql.execute(
            `SELECT
                id,
                nome,
                email,
                telefone,
                tipo,
                foto_url,
                email_verificado,
                telefone_verificado,
                ativo,
                criado_em,
                atualizado_em
             FROM usuarios
             WHERE id = ?
             LIMIT 1`,
            [usuarioId]
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Foto de perfil atualizada com sucesso.',
            usuario: resultado[0]
        });
    } catch (erro) {
        console.error('Erro ao atualizar foto de perfil:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar a foto de perfil.'
        });
    }
};

// =====================================================
// ALTERAR PALAVRA-PASSE
// =====================================================

exports.alterarSenha = async (req, res) => {
    try {
        const usuarioId = validarId(req.user?.id);

        if (!usuarioId) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Utilizador não autenticado.'
            });
        }

        const {
            senhaAtual,
            novaSenha,
            confirmarSenha
        } = req.body;

        if (!senhaAtual || !novaSenha || !confirmarSenha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Preencha todos os campos.'
            });
        }

        if (
            typeof novaSenha !== 'string' ||
            novaSenha.length < 8 ||
            Buffer.byteLength(novaSenha, 'utf8') > 72
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A nova palavra-passe deve ter entre 8 caracteres e 72 bytes.'
            });
        }

        if (novaSenha !== confirmarSenha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'As palavras-passe não coincidem.'
            });
        }

        if (senhaAtual === novaSenha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A nova palavra-passe deve ser diferente da atual.'
            });
        }

        const [usuarios] = await mysql.execute(
            `SELECT senha_hash
             FROM usuarios
             WHERE id = ?
             LIMIT 1`,
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Utilizador não encontrado.'
            });
        }

        const senhaCorreta = await bcrypt.compare(
            senhaAtual,
            usuarios[0].senha_hash
        );

        if (!senhaCorreta) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A palavra-passe atual está incorreta.'
            });
        }

        const novoHash = await bcrypt.hash(novaSenha, 12);

        await mysql.execute(
            `UPDATE usuarios
             SET senha_hash = ?
             WHERE id = ?`,
            [novoHash, usuarioId]
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Palavra-passe alterada com sucesso.'
        });

    } catch (erro) {
        console.error('Erro ao alterar senha:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao alterar a palavra-passe.'
        });
    }
};

// =====================================================
// DESATIVAR CONTA
// =====================================================

exports.desativarConta = async (req, res) => {
    try {
        const usuarioId = validarId(req.user?.id);

        if (!usuarioId) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Utilizador não autenticado.'
            });
        }

        const { senha } = req.body;

        if (!senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe a palavra-passe para continuar.'
            });
        }

        const [usuarios] = await mysql.execute(
            `SELECT senha_hash, ativo
             FROM usuarios
             WHERE id = ?
             LIMIT 1`,
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Utilizador não encontrado.'
            });
        }

        if (!usuarios[0].ativo) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Esta conta já está desativada.'
            });
        }

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuarios[0].senha_hash
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Palavra-passe incorreta.'
            });
        }

        await mysql.execute(
            `UPDATE usuarios
             SET ativo = FALSE
             WHERE id = ?`,
            [usuarioId]
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Conta desativada com sucesso.'
        });

    } catch (erro) {
        console.error('Erro ao desativar conta:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao desativar conta.'
        });
    }
};
