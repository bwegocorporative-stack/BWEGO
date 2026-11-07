const express = require("express");
const router = express.Router();

const entregaController = require("../controllers/entregaController");
const authMiddleware = require("../middlewares/authMiddleware");

// Todas as rotas de entregas exigem autenticação
router.use(authMiddleware);

// Criar uma nova entrega
router.post("/", entregaController.criar);

// Listar entregas
router.get("/", entregaController.listar);

// Consultar uma entrega específica
router.get("/:id", entregaController.buscarPorId);

// Consultar o histórico de uma entrega
router.get("/:id/historico", entregaController.listarHistorico);

// Atualizar o estado de uma entrega
router.patch("/:id/estado", entregaController.atualizarEstado);

// Cancelar uma entrega
router.patch("/:id/cancelar", entregaController.cancelar);

module.exports = router;
