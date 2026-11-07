
const express = require('express');
const router = express.Router();

const pedidosController = require('../controllers/pedidosController');

router.post('/', pedidosController.criarPedido);

router.get('/usuario/:usuario_id', pedidosController.listarPedidosUsuario);

router.get('/parceiro/:parceiro_id', pedidosController.listarPedidosParceiro);

router.get('/:id', pedidosController.detalhesPedido);

router.put('/:id/estado', pedidosController.actualizarEstadoPedido);

router.put('/:id/cancelar', pedidosController.cancelarPedido);

module.exports = router;
