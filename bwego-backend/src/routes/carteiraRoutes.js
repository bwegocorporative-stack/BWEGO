const express = require('express');
const carteiraController = require('../controllers/carteiraController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', carteiraController.obterCarteira);
router.post('/recargas', carteiraController.adicionarSaldo);
router.post('/transferencias', carteiraController.transferirSaldo);

module.exports = router;
