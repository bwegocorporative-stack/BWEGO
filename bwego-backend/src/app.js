const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// ======================================
// CONFIGURAÇÕES DE SEGURANÇA
// ======================================

app.use(helmet());

// ======================================
// CONFIGURAÇÃO CORS
// ======================================

const origensPermitidas = (
  process.env.CLIENT_ORIGINS || "http://localhost:8081,http://localhost:19006"
)
  .split(",")
  .map((origem) => origem.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origensPermitidas.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origem não autorizada."));
    },
    credentials: true,
  }),
);

// ======================================
// RECEBER DADOS JSON
// ======================================

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

// ======================================
// LIMITAR REQUISIÇÕES
// ======================================

const limitador = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,

  message: {
    sucesso: false,
    mensagem: "Demasiadas requisições. Tente novamente mais tarde.",
  },
});

app.use("/api", limitador);

// ======================================
// ROTA PRINCIPAL
// ======================================

app.get("/", (req, res) => {
  res.status(200).json({
    sucesso: true,
    aplicacao: "BWÉ GO",
    descricao: "Plataforma de mobilidade urbana e logística integrada.",
    versao: "1.0.0",
    servidor: "Online",
  });
});

// ======================================
// TESTAR ESTADO DA API
// ======================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    sucesso: true,
    mensagem: "API BWÉ GO operacional.",
    servidor: "Express",
    data: new Date().toISOString(),
  });
});

// ======================================
// ROTAS DA API
// ======================================

// Futuramente vamos adicionar:
//
// app.use('/api/auth', require('./routes/auth.routes'));
// app.use('/api/usuarios', require('./routes/usuarios.routes'));
// app.use('/api/motoristas', require('./routes/motoristas.routes'));
// app.use('/api/viagens', require('./routes/viagens.routes'));
// app.use('/api/pagamentos', require('./routes/pagamentos.routes'));

// ======================================
// ROTA NÃO ENCONTRADA
// ======================================

app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: "Rota não encontrada.",
    rota: req.originalUrl,
  });
});

// ======================================
// TRATAMENTO GLOBAL DE ERROS
// ======================================

app.use((erro, req, res, next) => {
  console.error("ERRO:", erro.message);

  if (res.headersSent) {
    return next(erro);
  }

  const status = erro.status || 500;

  res.status(status).json({
    sucesso: false,
    mensagem: status === 500 ? "Erro interno do servidor." : erro.message,
  });
});

module.exports = app;
