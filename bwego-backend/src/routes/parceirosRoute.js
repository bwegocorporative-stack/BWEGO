const express = require("express");
const router = express.Router();

const parceiroController = require("../controllers/parceiroController");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// Listar parceiros
router.get("/", parceiroController.listarParceiros);

// Consultar parceiro
router.get("/:id", parceiroController.buscarParceiroPorId);

// Cadastrar parceiro
router.post("/", authMiddleware, parceiroController.cadastrarParceiro);

// Atualizar parceiro
router.put("/:id", authMiddleware, parceiroController.atualizarParceiro);

// Ativar / desativar parceiro
router.patch(
  "/:id/estado",
  authMiddleware,
  adminMiddleware,
  parceiroController.alterarEstadoParceiro,
);

// Eliminar parceiro
router.delete("/:id", authMiddleware, parceiroController.eliminarParceiro);

module.exports = router;
