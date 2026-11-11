/*Lógica dos Controles sobre as Coletas e Regras de Negócio 
para as 3 telas do sistema também */
const prisma = require('../config/prisma');

// Cliente: Solicitar recolha de óleo
exports.solicitarColeta = async (req, res) => {
  try {
    const clienteId = req.usuario.id; // Extraído do Token JWT
    const { quantidadeGarrafas, enderecoColeta } = req.body;

    // Gera um código PET único (ex: PET-4829) para satisfazer a constraint @unique
    const codigoPET = `PET-${Math.floor(1000 + Math.random() * 9000)}`;

    const novaColeta = await prisma.coleta.create({
      data: {
        codigoPET,
        quantidadeGarrafas: parseInt(quantidadeGarrafas),
        enderecoColeta,
        clienteId
      }
    });

    return res.status(201).json(novaColeta);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// Listar recolhas (Com filtro por status para Motorista e Gestor)
exports.listarColetas = async (req, res) => {
  try {
    const { status } = req.query;
    const coletas = await prisma.coleta.findMany({
      where: status ? { status } : {},
      include: {
        cliente: { select: { nome: true, cpf: true, pix: true } },
        motorista: { select: { nome: true } }
      },
      orderBy: { dataSolicitacao: 'desc' }
    });
    res.json(coletas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// 2. CLIENTE: Lista apenas as coletas solicitadas por ELE
exports.listarMinhasColetas = async (req, res) => {
  try {
    const clienteId = req.usuario.id;

    const minhasColetas = await prisma.coleta.findMany({
      where: { clienteId },
      orderBy: { dataSolicitacao: 'desc' } // ✅ Campo correto do Schema
    });

    return res.status(200).json(minhasColetas);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar suas coletas: ' + error.message });
  }
};

// 3. MOTORISTA: Lista apenas as coletas PENDENTES para recolha na rua
exports.listarColetasPendentes = async (req, res) => {
  try {
    const coletasPendentes = await prisma.coleta.findMany({
      where: { status: 'PENDENTE' },
      include: {
        cliente: { select: { nome: true, endereco: true } }
      },
      orderBy: { dataSolicitacao: 'asc' } // ✅ Trocado de criadoEm para dataSolicitacao
    });

    return res.status(200).json(coletasPendentes);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar coletas pendentes: ' + error.message });
  }
};

// MOTORISTA: Histórico de coletas concluídas pelo próprio motorista
exports.listarHistoricoMotorista = async (req, res) => {
  try {
    const historico = await prisma.coleta.findMany({
      where: {
        motoristaId: req.usuario.id,
        status: { in: ['COLETADO', 'PAGO'] }
      },
      include: {
        cliente: { select: { nome: true } }
      },
      orderBy: { dataColeta: 'desc' }
    });

    return res.status(200).json(historico);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar histórico de coletas: ' + error.message });
  }
};

// Motorista: Confirmar recolha no local (Validação da garrafa PET)
exports.confirmarColeta = async (req, res) => {
  try {
    const { id } = req.params;
    const { motoristaId } = req.body;

    const coleta = await prisma.coleta.update({
      where: { id },
      data: {
        status: 'COLETADO',
        motoristaId,
        dataColeta: new Date()
      }
    });

    res.json(coleta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Gestor: Confirmar pagamento PIX realizado manualmente
exports.confirmarPagamento = async (req, res) => {
  try {
    const { id } = req.params;

    const coleta = await prisma.coleta.update({
      where: { id },
      data: {
        status: 'PAGO',
        dataPagamento: new Date()
      }
    });

    res.json(coleta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};