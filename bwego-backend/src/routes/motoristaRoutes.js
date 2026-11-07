
const express = require('express');
const router = express.Router();

const motoristaController = require('../controllers/motoristaController');
const authMiddleware = require('../middlewares/authMiddleware');

// =====================================================
// AUTENTICAÇÃO
// =====================================================

// Todas as rotas exigem autenticação JWT
router.use(authMiddleware);

// =====================================================
// ROTAS DO MOTORISTA
// =====================================================

// Cadastrar motorista
router.post(
    '/cadastrar',
    motoristaController.cadastrar
);

// Consultar o próprio perfil
router.get(
    '/perfil',
    motoristaController.obterPerfil
);

// Atualizar dados do motorista
router.put(
    '/perfil',
    motoristaController.atualizarPerfil
);

// Atualizar disponibilidade
router.patch(
    '/disponibilidade',
    motoristaController.atualizarDisponibilidade
);

// Atualizar localização GPS
router.patch(
    '/localizacao',
    motoristaController.atualizarLocalizacao
);

// Listar motoristas disponíveis perto do cliente autenticado
router.get(
    '/perto',
    motoristaController.listarProximos
);

// =====================================================
// ROTAS ADMINISTRATIVAS
// =====================================================

// Listar todos os motoristas
router.get(
    '/',
    motoristaController.listar
);

// Listar motoristas disponíveis
router.get(
    '/disponiveis',
    motoristaController.listarDisponiveis
);

// Buscar motorista por ID
router.get(
    '/:id',
    motoristaController.buscarPorId
);

// Aprovar, rejeitar ou suspender motorista
router.patch(
    '/:id/aprovacao',
    motoristaController.atualizarEstadoAprovacao
);

module.exports = router;
