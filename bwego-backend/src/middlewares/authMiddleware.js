
const jwt = require('jsonwebtoken');

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO BWÉ GO
// ============================================

const authMiddleware = (req, res, next) => {
    try {
        const authorization = req.headers.authorization;

        // Verificar se existe token
        if (!authorization) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Acesso negado. Token não fornecido.'
            });
        }

        // Verificar formato Bearer
        const partes = authorization.split(' ');

        if (partes.length !== 2 || partes[0] !== 'Bearer') {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Formato do token inválido. Utilize Bearer.'
            });
        }

        const token = partes[1];

        // Verificar JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Disponibilizar utilizador autenticado
        req.user = decoded;

        next();

    } catch (erro) {
        console.error('Erro de autenticação:', erro.message);

        return res.status(401).json({
            sucesso: false,
            mensagem: 'Token inválido ou expirado.'
        });
    }
};

module.exports = authMiddleware;
