const db = require('../config/db');

async function adminMiddleware(req, res, next) {
    if (req.user?.tipo !== 'admin') {
        return res.status(403).json({
            sucesso: false,
            mensagem: 'Apenas administradores podem aceder a esta área.'
        });
    }

    try {
        const [administradores] = await db.execute(
            `SELECT id
             FROM usuarios
             WHERE id = ? AND tipo = 'admin' AND ativo = TRUE
             LIMIT 1`,
            [req.user.id]
        );
        if (!administradores.length) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Esta conta de gestor foi removida ou desativada.'
            });
        }
        return next();
    } catch (erro) {
        console.error('Erro ao validar conta de gestor:', erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível validar a conta de gestor.'
        });
    }
}

module.exports = adminMiddleware;
