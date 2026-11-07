
require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const mysql = require('./config/db');
const configurarSockets = require('./socket');

// ============================================
// BWÉ GO - SERVIDOR PRINCIPAL
// ============================================

const app = express();

const PORT = process.env.PORT || 3000;

// ============================================
// IMPORTAÇÃO DAS ROTAS
// ============================================

// Autenticação e utilizadores
const authRoutes = require('./routes/authRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Mobilidade
const motoristasRoutes = require('./routes/motoristaRoutes');
const viagensRoutes = require('./routes/viagemRoutes');

// Logística
const entregasRoutes = require('./routes/entregaRoutes');

// Parceiros e produtos
const parceirosRoutes = require('./routes/parceirosRoute');
const produtosRoutes = require('./routes/produtosRoutes');

// Pedidos
const pedidosRoutes = require('./routes/pedidosRoutes');
const itensPedidosRoutes = require('./routes/itensPedidosRoutes');

// Pagamentos
const pagamentosRoutes = require('./routes/pagamentosRoutes');
const carteiraRoutes = require('./routes/carteiraRoutes');

// ============================================
// MIDDLEWARES
// ============================================

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],
    allowedHeaders: [
        'Content-Type',
        'Authorization'
    ]
}));

app.use(express.json({
    limit: '10mb'
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// ============================================
// SERVIDOR HTTP
// ============================================

const server = http.createServer(app);

// ============================================
// SOCKET.IO
// ============================================

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE'
        ],
        allowedHeaders: [
            'Content-Type',
            'Authorization'
        ]
    }
});

// Configurar eventos Socket.IO
configurarSockets(io);

// Disponibilizar Socket.IO nos controllers
app.set('io', io);

// ============================================
// ROTA PRINCIPAL
// ============================================

app.get('/', (req, res) => {
    res.status(200).json({
        sucesso: true,
        mensagem: 'Servidor BWÉ GO iniciado com sucesso!',
        status: 'Online',
        versao: '1.0.0',
        api: '/api',
        health: '/api/health'
    });
});

// ============================================
// TESTE DA BASE DE DADOS MYSQL
// ============================================

app.get('/api/health', async (req, res) => {
    try {
        const [resultado] = await mysql.query(
            'SELECT DATABASE() AS banco'
        );

        res.status(200).json({
            sucesso: true,
            servidor: 'BWÉ GO',
            status: 'Online',
            mysql: 'Conectado',
            banco: resultado[0].banco
        });

    } catch (erro) {
        console.error('Erro na conexão MySQL:', erro);

        res.status(500).json({
            sucesso: false,
            servidor: 'BWÉ GO',
            mysql: 'Desconectado',
            mensagem: 'Erro na conexão com a base de dados.'
        });
    }
});

// ============================================
// ROTAS DA API
// ============================================

// Autenticação
app.use('/api/auth', authRoutes);

// Utilizadores
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/admin', adminRoutes);

// Motoristas
app.use('/api/motoristas', motoristasRoutes);

// Viagens
app.use('/api/viagens', viagensRoutes);

// Entregas
app.use('/api/entregas', entregasRoutes);

// Parceiros
app.use('/api/parceiros', parceirosRoutes);

// Produtos
app.use('/api/produtos', produtosRoutes);

// Pedidos
app.use('/api/pedidos', pedidosRoutes);

// Itens dos pedidos
app.use('/api/itens-pedidos', itensPedidosRoutes);

// Pagamentos
app.use('/api/pagamentos', pagamentosRoutes);
app.use('/api/carteira', carteiraRoutes);

// ============================================
// ROTA NÃO ENCONTRADA
// ============================================

app.use((req, res) => {
    res.status(404).json({
        sucesso: false,
        mensagem: 'Rota não encontrada.',
        rota: req.originalUrl
    });
});

// ============================================
// TRATAMENTO GLOBAL DE ERROS
// ============================================

app.use((erro, req, res, next) => {
    console.error('Erro no servidor:', erro);

    if (res.headersSent) {
        return next(erro);
    }

    res.status(erro.status || 500).json({
        sucesso: false,
        mensagem: erro.message || 'Erro interno do servidor.'
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

server.listen(PORT, '0.0.0.0', () => {

    console.log('');
    console.log('========================================');
    console.log('           BWÉ GO BACKEND');
    console.log('========================================');

    console.log(`Servidor: http://localhost:${PORT}`);
    console.log(`API Health: http://localhost:${PORT}/api/health`);

    console.log('----------------------------------------');
    console.log('ROTAS REGISTADAS:');

    console.log('POST/GET  /api/auth');
    console.log('GET/POST  /api/usuarios');
    console.log('GET/POST  /api/motoristas');
    console.log('GET/POST  /api/viagens');
    console.log('GET/POST  /api/entregas');
    console.log('GET/POST  /api/parceiros');
    console.log('GET/POST  /api/produtos');
    console.log('GET/POST  /api/pedidos');
    console.log('GET/POST  /api/itens-pedidos');
    console.log('GET/POST  /api/pagamentos');

    console.log('----------------------------------------');
    console.log('Socket.IO: Ativo');
    console.log('Autenticação Socket.IO: JWT');
    console.log('Servidor: Online');
    console.log('========================================');
    console.log('');

});

// ============================================
// TRATAMENTO DE ERRO DO SERVIDOR
// ============================================

server.on('error', (erro) => {
    console.error('Erro ao iniciar o servidor:', erro.message);
});

// ============================================
// EXPORTAÇÃO
// ============================================

module.exports = {
    app,
    server,
    io
};
