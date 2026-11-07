
/**
 * BWÉ GO
 * UTILITÁRIO: VALIDAÇÃO DE NIF
 *
 * Responsável por:
 * - Validar o formato do NIF.
 * - Remover espaços e caracteres de separação.
 * - Verificar o tamanho.
 * - Permitir NIF de pessoas singulares e coletivas.
 *
 * NOTA:
 * A validação estrutural não confirma a existência
 * ou situação fiscal do NIF junto da AGT.
 */

/**
 * Normalizar NIF
 */
function normalizarNIF(nif) {

    if (typeof nif !== 'string' && typeof nif !== 'number') {
        return '';
    }

    return String(nif)
        .trim()
        .replace(/[\s.-]/g, '')
        .toUpperCase();
}

/**
 * Validar formato do NIF angolano
 */
function validarNIF(nif, opcoes = {}) {

    const {
        obrigatorio = true
    } = opcoes;

    if (
        nif === null ||
        nif === undefined ||
        String(nif).trim() === ''
    ) {

        return {
            valido: !obrigatorio,
            mensagem: obrigatorio
                ? 'O NIF é obrigatório.'
                : 'NIF não informado.',
            nif: null
        };
    }

    const nifNormalizado = normalizarNIF(nif);

    if (!nifNormalizado) {
        return {
            valido: false,
            mensagem: 'NIF inválido.',
            nif: null
        };
    }

    /**
     * Formato estrutural:
     * - NIF numérico com 9 dígitos.
     * - Não aceita letras ou símbolos adicionais.
     */
    if (!/^\d{9}$/.test(nifNormalizado)) {

        return {
            valido: false,
            mensagem: 'O NIF deve conter exatamente 9 dígitos numéricos.',
            nif: nifNormalizado
        };
    }

    // Rejeitar sequências compostas pelo mesmo dígito
    if (/^(\d)\1{8}$/.test(nifNormalizado)) {

        return {
            valido: false,
            mensagem: 'O NIF informado não possui um formato válido.',
            nif: nifNormalizado
        };
    }

    return {
        valido: true,
        mensagem: 'Formato do NIF válido.',
        nif: nifNormalizado
    };
}

/**
 * Verificar apenas se o NIF é válido
 */
function nifValido(nif, opcoes = {}) {
    return validarNIF(nif, opcoes).valido;
}

module.exports = {
    validarNIF,
    normalizarNIF,
    nifValido
};
