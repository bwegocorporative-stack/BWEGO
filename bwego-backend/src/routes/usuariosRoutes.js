
const express = require('express');
const router = express.Router();

const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

const receberFoto = (req, res, next) => {
    upload.single('foto')(req, res, (erro) => {
        if (erro) {
            erro.status = erro.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
            return next(erro);
        }

        next();
    });
};

// =====================================================
// AUTENTICAÇÃO
// =====================================================

// Todas as rotas exigem autenticação JWT
router.use(authMiddleware);

// =====================================================
// ROTAS DOS UTILIZADORES
// =====================================================

// Consultar perfil do utilizador autenticado
router.get(
    '/perfil',
    usuarioController.obterPerfil
);

// Atualizar dados pessoais
router.put(
    '/perfil',
    usuarioController.atualizarPerfil
);

// Atualizar a foto do utilizador autenticado
router.put(
    '/perfil/foto',
    receberFoto,
    usuarioController.atualizarFotoPerfil
);

// Alterar palavra-passe
router.patch(
    '/alterar-senha',
    usuarioController.alterarSenha
);

// Desativar conta
router.patch(
    '/desativar-conta',
    usuarioController.desativarConta
);

module.exports = router;
