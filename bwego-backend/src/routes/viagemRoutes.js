
const express = require('express');
const router = express.Router();

const viagemController = require('../controllers/viagemController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas exigem autenticação JWT
router.use(authMiddleware);

// =====================================================
// ROTAS DE VIAGENS
// =====================================================

// Criar solicitação de viagem
router.post(
    '/',
    viagemController.criar
);

// Listar viagens do utilizador autenticado
router.get(
    '/',
    viagemController.listar
);

// Converter coordenadas em endereço
router.get(
    '/localizacao/reversa',
    viagemController.geocodificarLocalizacao
);

// Atualizar localização GPS do motorista
router.patch(
    '/localizacao',
    viagemController.atualizarLocalizacao
);

// Aceitar uma viagem
router.patch(
    '/:id/aceitar',
    viagemController.aceitar
);

// Atualizar estado da viagem
router.patch(
    '/:id/estado',
    viagemController.atualizarEstado
);

// Cancelar viagem
router.patch(
    '/:id/cancelar',
    viagemController.cancelar
);

// Avaliar viagem
router.post(
    '/:id/avaliar',
    viagemController.avaliar
);

// Consultar viagem por ID
router.get(
    '/:id',
    viagemController.buscarPorId
);

module.exports = router;
