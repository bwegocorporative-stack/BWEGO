const express = require("express");
const { rateLimit } = require("express-rate-limit");

const authController = require("../controllers/authController");
const upload = require("../middlewares/upload");

const router = express.Router();

// Limitar tentativas de login
const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    sucesso: false,
    mensagem: "Demasiadas tentativas. Tente novamente mais tarde.",
  },
});

// Limitar tentativas de registo
const limitarRegisto = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    sucesso: false,
    mensagem: "Demasiadas tentativas de registo. Tente novamente mais tarde.",
  },
});

const limitarConfiguracaoAdmin = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    sucesso: false,
    mensagem: "Demasiadas tentativas de configuração. Tente novamente mais tarde.",
  },
});

const receberFoto = (req, res, next) => {
  upload.single("foto")(req, res, (erro) => {
    if (erro) {
      erro.status = erro.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return next(erro);
    }

    next();
  });
};

// Registar utilizador
router.post("/registar", limitarRegisto, receberFoto, authController.registar);

// Configuração protegida do primeiro administrador
router.get("/admin-setup/status", authController.estadoConfiguracaoAdmin);
router.post(
  "/admin-setup",
  limitarConfiguracaoAdmin,
  authController.registarPrimeiroAdmin
);

// Login
router.post("/login", limitarLogin, authController.login);

module.exports = router;
