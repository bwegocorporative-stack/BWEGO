
/**
 * BWÉ GO
 * UTILITÁRIO: FORMATAR MOEDA
 *
 * Moeda oficial: Kwanza
 * Código: AOA
 * País: Angola
 */

const MOEDA = 'AOA';
const LOCALIDADE = 'pt-AO';

// Validar valores monetários
function validarValor(valor) {

    if (
        valor === null ||
        valor === undefined ||
        valor === '' ||
        !Number.isFinite(Number(valor))
    ) {
        throw new Error('Valor monetário inválido.');
    }

    return Number(valor);
}

// Formatar moeda com símbolo
function formatarMoeda(valor) {

    const numero = validarValor(valor);

    return new Intl.NumberFormat(LOCALIDADE, {
        style: 'currency',
        currency: MOEDA,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numero);
}

// Formatar moeda sem símbolo
function formatarValor(valor) {

    const numero = validarValor(valor);

    return new Intl.NumberFormat(LOCALIDADE, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numero);
}

// Formatar moeda sem casas decimais
function formatarMoedaInteira(valor) {

    const numero = validarValor(valor);

    return new Intl.NumberFormat(LOCALIDADE, {
        style: 'currency',
        currency: MOEDA,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(numero);
}

// Formatar valor para apresentação com Kz
function formatarKwanza(valor) {

    const numero = validarValor(valor);

    return `${new Intl.NumberFormat(LOCALIDADE, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numero)} Kz`;
}

// Exportar funções
module.exports = {
    formatarMoeda,
    formatarValor,
    formatarMoedaInteira,
    formatarKwanza
};
