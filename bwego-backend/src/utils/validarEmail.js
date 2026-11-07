
/**
 * BWÉ GO
 * UTILITÁRIO: VALIDAÇÃO DE EMAIL
 *
 * Responsável por:
 * - Verificar se o email é válido.
 * - Remover espaços desnecessários.
 * - Normalizar o email para minúsculas.
 * - Validar o tamanho do endereço.
 * - Verificar o formato do domínio.
 */

const MAXIMO_EMAIL = 254;
const MAXIMO_PARTE_LOCAL = 64;

/**
 * Normalizar email
 */
function normalizarEmail(email) {

    if (typeof email !== 'string') {
        return '';
    }

    return email.trim().toLowerCase();
}

/**
 * Validar formato do email
 */
function validarEmail(email) {

    const emailNormalizado = normalizarEmail(email);

    if (!emailNormalizado) {
        return {
            valido: false,
            mensagem: 'O email é obrigatório.',
            email: null
        };
    }

    if (emailNormalizado.length > MAXIMO_EMAIL) {
        return {
            valido: false,
            mensagem: 'O email ultrapassa o limite de 254 caracteres.',
            email: emailNormalizado
        };
    }

    // Não permitir espaços internos
    if (/\s/.test(emailNormalizado)) {
        return {
            valido: false,
            mensagem: 'O email não pode conter espaços.',
            email: emailNormalizado
        };
    }

    // Exatamente um símbolo @
    const partes = emailNormalizado.split('@');

    if (partes.length !== 2) {
        return {
            valido: false,
            mensagem: 'O formato do email é inválido.',
            email: emailNormalizado
        };
    }

    const [parteLocal, dominio] = partes;

    if (!parteLocal || !dominio) {
        return {
            valido: false,
            mensagem: 'O email deve conter um utilizador e um domínio.',
            email: emailNormalizado
        };
    }

    if (parteLocal.length > MAXIMO_PARTE_LOCAL) {
        return {
            valido: false,
            mensagem: 'A parte inicial do email ultrapassa 64 caracteres.',
            email: emailNormalizado
        };
    }

    // Verificar caracteres permitidos na parte local
    const formatoLocal =
        /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i;

    if (!formatoLocal.test(parteLocal)) {
        return {
            valido: false,
            mensagem: 'A parte inicial do email contém caracteres inválidos.',
            email: emailNormalizado
        };
    }

    // Não permitir ponto no início, fim ou pontos consecutivos
    if (
        parteLocal.startsWith('.') ||
        parteLocal.endsWith('.') ||
        parteLocal.includes('..')
    ) {
        return {
            valido: false,
            mensagem: 'A parte inicial do email possui pontos inválidos.',
            email: emailNormalizado
        };
    }

    // Validar domínio
    if (dominio.length > 253 || !dominio.includes('.')) {
        return {
            valido: false,
            mensagem: 'O domínio do email é inválido.',
            email: emailNormalizado
        };
    }

    const partesDominio = dominio.split('.');

    for (const parte of partesDominio) {

        if (
            !parte ||
            parte.length > 63 ||
            !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(parte)
        ) {
            return {
                valido: false,
                mensagem: 'O domínio contém caracteres inválidos.',
                email: emailNormalizado
            };
        }
    }

    // Validar extensão do domínio
    const extensao = partesDominio[partesDominio.length - 1];

    if (!/^[a-z]{2,63}$/i.test(extensao)) {
        return {
            valido: false,
            mensagem: 'A extensão do domínio é inválida.',
            email: emailNormalizado
        };
    }

    return {
        valido: true,
        mensagem: 'Email válido.',
        email: emailNormalizado
    };
}

/**
 * Verificar apenas se o email é válido
 */
function emailValido(email) {
    return validarEmail(email).valido;
}

module.exports = {
    validarEmail,
    normalizarEmail,
    emailValido
};
