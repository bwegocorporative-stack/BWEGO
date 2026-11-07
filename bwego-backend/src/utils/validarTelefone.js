
/**
 * BWÉ GO
 * UTILITÁRIO: VALIDAÇÃO DE TELEFONE
 *
 * Funcionalidades:
 * - Validar números angolanos.
 * - Aceitar números com ou sem +244.
 * - Normalizar números para formato internacional.
 * - Validar números internacionais.
 * - Permitir telefone obrigatório ou opcional.
 */

const CODIGO_PAIS_PADRAO = '244';

const PREFIXOS_ANGOLA = [
    '91', '92', '93', '94', '95', '96', '97', '98', '99',
    '90'
];

/**
 * Remover espaços, parênteses, hífens e outros separadores.
 */
function normalizarEntrada(telefone) {

    if (
        typeof telefone !== 'string' &&
        typeof telefone !== 'number'
    ) {
        return '';
    }

    let numero = String(telefone).trim();

    // Remover separadores comuns
    numero = numero.replace(/[\s().-]/g, '');

    // Manter apenas números e o sinal + inicial
    if (numero.startsWith('+')) {
        numero = '+' + numero.slice(1).replace(/\D/g, '');
    } else {
        numero = numero.replace(/\D/g, '');
    }

    return numero;
}

/**
 * Normalizar telefone angolano.
 *
 * Resultado: +244XXXXXXXXX
 */
function normalizarTelefoneAngola(telefone) {

    let numero = normalizarEntrada(telefone);

    if (!numero) {
        return null;
    }

    // Remover o sinal + para análise
    numero = numero.replace(/^\+/, '');

    // Remover o prefixo internacional 00
    if (numero.startsWith('00')) {
        numero = numero.slice(2);
    }

    // Se já tiver o indicativo de Angola
    if (numero.startsWith(CODIGO_PAIS_PADRAO)) {
        numero = numero.slice(3);
    }

    // O número nacional deve possuir 9 dígitos
    if (!/^\d{9}$/.test(numero)) {
        return null;
    }

    return `+${CODIGO_PAIS_PADRAO}${numero}`;
}

/**
 * Validar telefone angolano.
 */
function validarTelefoneAngola(telefone) {

    const normalizado = normalizarTelefoneAngola(telefone);

    if (!normalizado) {
        return {
            valido: false,
            mensagem: 'Número de telefone angolano inválido.',
            telefone: null
        };
    }

    const numeroNacional = normalizado.slice(4);

    const prefixo = numeroNacional.slice(0, 2);

    if (!PREFIXOS_ANGOLA.includes(prefixo)) {
        return {
            valido: false,
            mensagem: 'O prefixo do número não é reconhecido.',
            telefone: normalizado
        };
    }

    return {
        valido: true,
        mensagem: 'Número de telefone angolano válido.',
        telefone: normalizado,
        codigoPais: '+244',
        numeroNacional
    };
}

/**
 * Validar telefone internacional.
 *
 * Exige o indicativo internacional.
 */
function validarTelefoneInternacional(telefone) {

    const numero = normalizarEntrada(telefone);

    if (!numero) {
        return {
            valido: false,
            mensagem: 'Número de telefone inválido.',
            telefone: null
        };
    }

    let internacional = numero;

    if (internacional.startsWith('00')) {
        internacional = '+' + internacional.slice(2);
    }

    if (!internacional.startsWith('+')) {
        return {
            valido: false,
            mensagem: 'Informe o número com o indicativo internacional.',
            telefone: null
        };
    }

    const digitos = internacional.slice(1);

    if (!/^[1-9]\d{7,14}$/.test(digitos)) {
        return {
            valido: false,
            mensagem: 'O número internacional possui formato inválido.',
            telefone: null
        };
    }

    return {
        valido: true,
        mensagem: 'Número internacional com formato válido.',
        telefone: internacional
    };
}

/**
 * Validar telefone.
 *
 * Por padrão, valida números angolanos.
 */
function validarTelefone(telefone, opcoes = {}) {

    const {
        obrigatorio = true,
        internacional = false
    } = opcoes;

    if (
        telefone === null ||
        telefone === undefined ||
        String(telefone).trim() === ''
    ) {
        return {
            valido: !obrigatorio,
            mensagem: obrigatorio
                ? 'O telefone é obrigatório.'
                : 'Telefone não informado.',
            telefone: null
        };
    }

    if (internacional) {
        return validarTelefoneInternacional(telefone);
    }

    return validarTelefoneAngola(telefone);
}

/**
 * Verificar apenas se o telefone é válido.
 */
function telefoneValido(telefone, opcoes = {}) {
    return validarTelefone(telefone, opcoes).valido;
}

module.exports = {
    validarTelefone,
    validarTelefoneAngola,
    validarTelefoneInternacional,
    normalizarTelefoneAngola,
    telefoneValido
};
