const express = require("express");
const router = express.Router();

const produtosController = require("../controllers/produtosController");

const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const upload = require("../middlewares/upload");

// Listar produtos
router.get("/", produtosController.listarProdutos);

// Consultar produto
router.get("/:id", produtosController.buscarProdutoPorId);

// Cadastrar produto com imagem
router.post(
  "/",
  authMiddleware,
  upload.single("imagem"),
  produtosController.cadastrarProduto,
);

// Atualizar produto e imagem
router.put(
  "/:id",
  authMiddleware,
  upload.single("imagem"),
  produtosController.atualizarProduto,
);

// Ativar / desativar
router.patch(
  "/:id/estado",
  authMiddleware,
  adminMiddleware,
  produtosController.alterarEstadoProduto,
);

// Eliminar produto
router.delete("/:id", authMiddleware, produtosController.eliminarProduto);

module.exports = router;
