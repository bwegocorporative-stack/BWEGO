const db = require('../config/db');

async function adminOuGestorMiddleware(req, res, next) {
    const tipo = req.user?.tipo;
    if (tipo !== 'admin' && tipo !== 'gestor') {
        return res.status(403).json({
            sucesso: false,
            mensagem: 'Apenas administradores e gestores podem aceder a esta área.'
        });
    }

    const tabela = tipo === 'admin' ? 'usuarios' : 'gestores';
    const filtroTipo = tipo === 'admin' ? "AND tipo = 'admin'" : '';
    try {
        const [contas] = await db.execute(
            `SELECT id FROM ${tabela} WHERE id = ? ${filtroTipo} AND ativo = TRUE LIMIT 1`,
            [req.user.id]
        );
        if (!contas.length) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Esta conta foi removida ou desativada.'
            });
        }
        return next();
    } catch (erro) {
        console.error('Erro ao validar conta administrativa:', erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível validar a conta.'
        });
    }
}

module.exports = adminOuGestorMiddleware;
