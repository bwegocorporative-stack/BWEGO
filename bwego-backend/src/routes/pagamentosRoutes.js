const express = require("express");
const router = express.Router();

const pagamentosController = require("../controllers/pagamentosController");

const authMiddleware = require("../middlewares/authMiddleware");

// Registar pagamento
router.post("/", authMiddleware, pagamentosController.registarPagamento);

// Listar pagamentos do cliente
router.get("/", authMiddleware, pagamentosController.listarPagamentos);

// Consultar pagamento
router.get("/:id", authMiddleware, pagamentosController.buscarPagamentoPorId);

// Cancelar pagamento
router.patch(
  "/:id/cancelar",
  authMiddleware,
  pagamentosController.cancelarPagamento,
);

// Confirmação interna do provedor.
// Proteger esta rota com assinatura/autenticação do webhook.
router.patch("/:id/confirmar", pagamentosController.confirmarPagamento);

module.exports = router;
