const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const motoristaController = require('../controllers/motoristaController');
const parceiroController = require('../controllers/parceiroController');
const produtosController = require('../controllers/produtosController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const upload = require('../middlewares/upload');

router.use(authMiddleware, adminMiddleware);

router.get('/dashboard', adminController.obterDashboard);
router.get('/gestores', adminController.listarGestores);
router.post('/gestores', adminController.criarGestor);
router.delete('/gestores/:id', adminController.removerGestor);
router.get('/clientes', adminController.listarClientes);
router.get('/motoristas', motoristaController.listar);
router.get('/parceiros', parceiroController.listarParceiros);
router.get('/farmacias', (req, res, next) => {
    req.adminFarmaciasOnly = true;
    next();
}, parceiroController.listarParceiros);
router.get('/produtos', produtosController.listarProdutos);
router.get('/categorias-produtos', produtosController.listarCategorias);
router.put('/categorias-produtos', produtosController.atualizarCategoria);
router.delete('/categorias-produtos', produtosController.eliminarCategoria);

router.put('/clientes/:id', adminController.atualizarCliente);
router.put('/motoristas/:id', adminController.atualizarMotorista);
router.put('/parceiros/:id', upload.single('imagem'), parceiroController.atualizarParceiro);
router.delete('/parceiros/:id', parceiroController.eliminarParceiro);
router.put('/produtos/:id', upload.single('imagem'), produtosController.atualizarProduto);
router.delete('/produtos/:id', produtosController.eliminarProduto);
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
    upload.single('imagem'),
    exigirImagemPerfil,
    parceiroController.cadastrarParceiro
);
router.post('/farmacias', upload.single('imagem'), exigirImagemPerfil, (req, res, next) => {
    req.body = { ...(req.body || {}), tipo_empresa: 'farmacia' };
    next();
}, parceiroController.cadastrarParceiro);
router.post('/produtos', upload.single('imagem'), (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Seleciona uma imagem para o produto.'
        });
    }
    next();
}, produtosController.cadastrarProduto);
router.post('/categorias-produtos', produtosController.cadastrarCategoria);

router.patch(
    '/motoristas/:id/aprovacao',
    motoristaController.atualizarEstadoAprovacao
);
router.patch(
    '/parceiros/:id/estado',
    parceiroController.alterarEstadoParceiro
);
router.patch(
    '/produtos/:id/estado',
    produtosController.alterarEstadoProduto
);

module.exports = router;
