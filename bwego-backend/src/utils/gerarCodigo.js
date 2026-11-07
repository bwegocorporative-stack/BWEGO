
/**
 * BWÉ GO
 * UTILITÁRIO: GERAR CÓDIGOS ÚNICOS
 *
 * Utilizado para:
 * - Pedidos
 * - Viagens
 * - Entregas
 * - Pagamentos
 * - Parceiros
 * - Referências internas
 */

const crypto = require('crypto');

// Gerar código aleatório seguro
function gerarCodigo(prefixo = 'BWE', tamanho = 8) {

    if (
        typeof prefixo !== 'string' ||
        !/^[A-Z0-9]+$/i.test(prefixo)
    ) {
        throw new Error('Prefixo inválido.');
    }

    if (
        !Number.isInteger(tamanho) ||
        tamanho < 4 ||
        tamanho > 32
    ) {
        throw new Error('O tamanho deve estar entre 4 e 32.');
    }

    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let codigo = '';

    // Gerar caracteres aleatórios criptograficamente seguros
    const bytes = crypto.randomBytes(tamanho);

    for (let i = 0; i < tamanho; i++) {
        codigo += caracteres[bytes[i] % caracteres.length];
    }

    return `${prefixo.toUpperCase()}-${codigo}`;
}

// Gerar código para pedido
function gerarCodigoPedido() {
    return gerarCodigo('PED', 8);
}

// Gerar código para viagem
function gerarCodigoViagem() {
    return gerarCodigo('VIA', 8);
}

// Gerar código para entrega
function gerarCodigoEntrega() {
    return gerarCodigo('ENT', 8);
}

// Gerar código para pagamento
function gerarCodigoPagamento() {
    return gerarCodigo('PAG', 10);
}

// Gerar código para parceiro
function gerarCodigoParceiro() {
    return gerarCodigo('PAR', 8);
}

// Gerar código para motorista
function gerarCodigoMotorista() {
    return gerarCodigo('MOT', 8);
}

// Gerar código para produto
function gerarCodigoProduto() {
    return gerarCodigo('PRO', 8);
}

// Gerar referência de operação
function gerarReferencia(prefixo = 'REF') {
    const data = new Date().toISOString()
        .replace(/[-:.TZ]/g, '');

    const aleatorio = crypto.randomBytes(4).toString('hex').toUpperCase();

    return `${prefixo.toUpperCase()}-${data}-${aleatorio}`;
}

module.exports = {
    gerarCodigo,
    gerarCodigoPedido,
    gerarCodigoViagem,
    gerarCodigoEntrega,
    gerarCodigoPagamento,
    gerarCodigoParceiro,
    gerarCodigoMotorista,
    gerarCodigoProduto,
    gerarReferencia
};
