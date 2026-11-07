
/**
 * BWÉ GO
 * UTILITÁRIO: GERAR REFERÊNCIAS
 *
 * Utilizado para:
 * - Pagamentos
 * - Transferências
 * - Pedidos
 * - Viagens
 * - Entregas
 *
 * As referências são identificadores internos da plataforma.
 * Não substituem referências oficiais de bancos ou prestadores
 * de serviços de pagamento.
 */

const crypto = require('crypto');

const PREFIXOS = {
    PAGAMENTO: 'PAG',
    TRANSFERENCIA: 'TRF',
    PEDIDO: 'PED',
    VIAGEM: 'VIA',
    ENTREGA: 'ENT',
    REEMBOLSO: 'REE',
    CARTEIRA: 'CAR'
};

/**
 * Validar prefixo
 */
function validarPrefixo(prefixo) {

    if (
        typeof prefixo !== 'string' ||
        !/^[A-Z0-9]{2,10}$/i.test(prefixo)
    ) {
        throw new Error('Prefixo da referência inválido.');
    }

    return prefixo.toUpperCase();
}

/**
 * Gerar referência única
 */
function gerarReferencia(prefixo = 'BWE') {

    const prefixoValidado = validarPrefixo(prefixo);

    const data = new Date();

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    const identificador = crypto
        .randomBytes(8)
        .toString('hex')
        .toUpperCase();

    return `${prefixoValidado}-${ano}${mes}${dia}-${identificador}`;
}

/**
 * Gerar referência de pagamento
 */
function gerarReferenciaPagamento() {
    return gerarReferencia(PREFIXOS.PAGAMENTO);
}

/**
 * Gerar referência de transferência
 */
function gerarReferenciaTransferencia() {
    return gerarReferencia(PREFIXOS.TRANSFERENCIA);
}

/**
 * Gerar referência de pedido
 */
function gerarReferenciaPedido() {
    return gerarReferencia(PREFIXOS.PEDIDO);
}

/**
 * Gerar referência de viagem
 */
function gerarReferenciaViagem() {
    return gerarReferencia(PREFIXOS.VIAGEM);
}

/**
 * Gerar referência de entrega
 */
function gerarReferenciaEntrega() {
    return gerarReferencia(PREFIXOS.ENTREGA);
}

/**
 * Gerar referência de reembolso
 */
function gerarReferenciaReembolso() {
    return gerarReferencia(PREFIXOS.REEMBOLSO);
}

/**
 * Gerar referência de carteira
 */
function gerarReferenciaCarteira() {
    return gerarReferencia(PREFIXOS.CARTEIRA);
}

module.exports = {
    PREFIXOS,
    gerarReferencia,
    gerarReferenciaPagamento,
    gerarReferenciaTransferencia,
    gerarReferenciaPedido,
    gerarReferenciaViagem,
    gerarReferenciaEntrega,
    gerarReferenciaReembolso,
    gerarReferenciaCarteira
};
