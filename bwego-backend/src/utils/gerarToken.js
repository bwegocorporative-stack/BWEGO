
/**
 * BWÉ GO
 * UTILITÁRIO: GERAR E VALIDAR TOKENS JWT
 *
 * Utilizado para:
 * - Autenticação de utilizadores
 * - Autenticação de motoristas
 * - Autenticação de parceiros
 * - Autenticação de administradores
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Obter chave secreta
const JWT_SECRET = process.env.JWT_SECRET;

// Obter tempo de expiração
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Validar configuração
function verificarConfiguracao() {

    if (!JWT_SECRET || JWT_SECRET.length < 32) {
        throw new Error(
            'JWT_SECRET não configurado ou demasiado curto. ' +
            'Define uma chave segura com pelo menos 32 caracteres.'
        );
    }
}

// Gerar token JWT
function gerarToken(dadosUsuario, opcoes = {}) {

    verificarConfiguracao();

    if (
        !dadosUsuario ||
        typeof dadosUsuario !== 'object' ||
        Array.isArray(dadosUsuario)
    ) {
        throw new Error('Dados do utilizador inválidos.');
    }

    const {
        id,
        usuario_id,
        tipo_usuario,
        role,
        permissoes
    } = dadosUsuario;

    if (!id && !usuario_id) {
        throw new Error('ID do utilizador não fornecido.');
    }

    const payload = {
        id: id || usuario_id,
        usuario_id: usuario_id || id,
        tipo_usuario: tipo_usuario || role || 'cliente',
        permissoes: Array.isArray(permissoes) ? permissoes : []
    };

    // Preservar IDs específicos, quando fornecidos
    if (dadosUsuario.motorista_id) {
        payload.motorista_id = dadosUsuario.motorista_id;
    }

    if (dadosUsuario.parceiro_id) {
        payload.parceiro_id = dadosUsuario.parceiro_id;
    }

    const expiresIn = opcoes.expiresIn || JWT_EXPIRES_IN;

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn,
        issuer: 'bwe-go',
        audience: 'bwe-go-app'
    });
}

// Verificar token JWT
function verificarToken(token) {

    verificarConfiguracao();

    if (!token || typeof token !== 'string') {
        throw new Error('Token não fornecido.');
    }

    return jwt.verify(token, JWT_SECRET, {
        issuer: 'bwe-go',
        audience: 'bwe-go-app'
    });
}

// Decodificar token sem verificar assinatura
function decodificarToken(token) {

    if (!token || typeof token !== 'string') {
        throw new Error('Token não fornecido.');
    }

    const dados = jwt.decode(token);

    if (!dados) {
        throw new Error('Não foi possível decodificar o token.');
    }

    return dados;
}

// Gerar token de atualização
function gerarRefreshToken(dadosUsuario) {

    verificarConfiguracao();

    if (!dadosUsuario || !dadosUsuario.id) {
        throw new Error('ID do utilizador não fornecido.');
    }

    return jwt.sign(
        {
            id: dadosUsuario.id,
            tipo: 'refresh'
        },
        JWT_SECRET,
        {
            expiresIn: '30d',
            issuer: 'bwe-go',
            audience: 'bwe-go-refresh'
        }
    );
}

// Verificar refresh token
function verificarRefreshToken(token) {

    verificarConfiguracao();

    if (!token || typeof token !== 'string') {
        throw new Error('Refresh token não fornecido.');
    }

    const dados = jwt.verify(token, JWT_SECRET, {
        issuer: 'bwe-go',
        audience: 'bwe-go-refresh'
    });

    if (dados.tipo !== 'refresh') {
        throw new Error('Token de atualização inválido.');
    }

    return dados;
}

module.exports = {
    gerarToken,
    verificarToken,
    decodificarToken,
    gerarRefreshToken,
    verificarRefreshToken
};
