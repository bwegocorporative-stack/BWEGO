const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const motoristaController = require('../controllers/motoristaController');
const parceiroController = require('../controllers/parceiroController');
const produtosController = require('../controllers/produtosController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const adminOuGestorMiddleware = require('../middlewares/adminOuGestorMiddleware');
const upload = require('../middlewares/upload');
const gestoresController = require('../controllers/gestoresController');

router.use(authMiddleware);

router.get('/dashboard', adminOuGestorMiddleware, adminController.obterDashboard);
router.get('/gestores', adminMiddleware, gestoresController.listar);
router.post('/gestores', adminMiddleware, upload.single('imagem'), gestoresController.criar);
router.put('/gestores/:id', adminMiddleware, upload.single('imagem'), gestoresController.atualizar);
router.delete('/gestores/:id', adminMiddleware, gestoresController.remover);
router.get('/clientes', adminOuGestorMiddleware, adminController.listarClientes);
router.get('/motoristas', adminOuGestorMiddleware, motoristaController.listar);
router.get('/parceiros', adminOuGestorMiddleware, parceiroController.listarParceiros);
router.get('/farmacias', (req, res, next) => {
    req.adminFarmaciasOnly = true;
    next();
}, adminOuGestorMiddleware, parceiroController.listarParceiros);
router.get('/produtos', adminOuGestorMiddleware, produtosController.listarProdutos);
router.get('/categorias-produtos', adminOuGestorMiddleware, produtosController.listarCategorias);
router.put('/categorias-produtos', adminMiddleware, produtosController.atualizarCategoria);
router.delete('/categorias-produtos', adminMiddleware, produtosController.eliminarCategoria);

router.put('/clientes/:id', adminMiddleware, upload.single('imagem'), adminController.atualizarCliente);
router.put('/motoristas/:id', adminMiddleware, upload.single('imagem'), adminController.atualizarMotorista);
router.put('/parceiros/:id', adminMiddleware, upload.single('imagem'), parceiroController.atualizarParceiro);
router.delete('/parceiros/:id', adminMiddleware, parceiroController.eliminarParceiro);
router.put('/produtos/:id', adminMiddleware, upload.single('imagem'), produtosController.atualizarProduto);
router.delete('/produtos/:id', adminMiddleware, produtosController.eliminarProduto);
const exigirImagemPerfil = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Seleciona uma imagem de perfil para o estabelecimento.'
        });
    }
    next();
};

router.post(
    '/parceiros',
    adminMiddleware,
    upload.single('imagem'),
    exigirImagemPerfil,
    parceiroController.cadastrarParceiro
);
router.post('/farmacias', adminMiddleware, upload.single('imagem'), exigirImagemPerfil, (req, res, next) => {
    req.body = { ...(req.body || {}), tipo_empresa: 'farmacia' };
    next();
}, parceiroController.cadastrarParceiro);
router.post('/produtos', adminMiddleware, upload.single('imagem'), (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Seleciona uma imagem para o produto.'
        });
    }
    next();
}, produtosController.cadastrarProduto);
router.post('/categorias-produtos', adminMiddleware, produtosController.cadastrarCategoria);

router.patch(
    '/motoristas/:id/aprovacao',
    adminOuGestorMiddleware,
    motoristaController.atualizarEstadoAprovacao
);
router.patch(
    '/parceiros/:id/estado',
    adminMiddleware,
    parceiroController.alterarEstadoParceiro
);
router.patch(
    '/produtos/:id/estado',
    adminMiddleware,
    produtosController.alterarEstadoProduto
);

module.exports = router;
