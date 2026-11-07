const express = require("express");
const router = express.Router();

const itensPedidosController = require("../controllers/itensPedidosController");

const authMiddleware = require("../middlewares/authMiddleware");

// Listar itens de um pedido
router.get(
  "/:pedido_id",
  authMiddleware,
  itensPedidosController.listarItensPedido,
);

// Adicionar item
router.post("/", authMiddleware, itensPedidosController.adicionarItemPedido);

// Atualizar quantidade
router.put(
  "/:id",
  authMiddleware,
  itensPedidosController.atualizarQuantidadeItem,
);

// Remover item
router.delete("/:id", authMiddleware, itensPedidosController.removerItemPedido);

module.exports = router;
