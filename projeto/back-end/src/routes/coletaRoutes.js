/*Mapeia os endpoints das recolhas*/
/*OBS: caso for alterar fique atento com o controller também*/
const express = require('express');
const router = express.Router();
const coletaController = require('../controllers/coletaController.js');
const { autenticar, autorizar } = require('../middlewares/authMiddleware.js')

router.use(autenticar);

router.post('/coletas',  autorizar('CLIENTE'),coletaController.solicitarColeta);
router.get('/', autorizar('GESTOR'), coletaController.listarColetas);
router.put('/:id/coletar', autorizar('MOTORISTA'), coletaController.confirmarColeta);
router.put('/:id/pagar', autorizar('GESTOR'), coletaController.confirmarPagamento);
// --- ROTAS DO CLIENTE ---
router.post('/', autorizar('CLIENTE'), coletaController.solicitarColeta);
router.get('/minhas-coletas', autorizar('CLIENTE'), coletaController.listarMinhasColetas);

// --- ROTAS DO MOTORISTA ---
router.get('/pendentes', autorizar('MOTORISTA'), coletaController.listarColetasPendentes);
router.get('/historico', autorizar('MOTORISTA'), coletaController.listarHistoricoMotorista);
router.put('/:id/coletar', autorizar('MOTORISTA'), coletaController.confirmarColeta);
module.exports = router;


/*
Rotas pra Testar:
GET de coletas (CLIENTE) GET : http://localhost:5000/api/minhas-coletas
POST de coletas (CLIENTE) POST (solicitar coleta):  http://localhost:5000/api/coletas
PUT pra confirmar coleta e concluir PUT (MOTORISTA): http://localhost:5000/api/coletas/:id/coletar
PUT pra confirmar pagamento(GESTOR): http://localhost:5000/api/coletas/:id/pagar
GET de coletas(GESTOR): http://localhost:5000/api/coletas

*/