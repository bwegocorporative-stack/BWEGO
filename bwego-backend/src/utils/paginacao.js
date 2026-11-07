
/**
 * BWÉ GO
 * UTILITÁRIO: PAGINAÇÃO
 *
 * Responsável por:
 * - Calcular páginas
 * - Definir limites de registos
 * - Calcular OFFSET do MySQL
 * - Organizar metadados da paginação
 * - Formatar respostas paginadas
 */

const CONSTANTES = require('./constantes');

// Configurações padrão
const PAGINA_PADRAO = 1;

const LIMITE_PADRAO =
    CONSTANTES.LIMITES.PAGINACAO_PADRAO || 10;

const LIMITE_MAXIMO =
    CONSTANTES.LIMITES.LIMITE_PAGINACAO || 50;

// Validar número inteiro positivo
function validarNumero(valor, padrao) {

    const numero = Number(valor);

    if (
        !Number.isSafeInteger(numero) ||
        numero < 1
    ) {
        return padrao;
    }

    return numero;
}

// Calcular parâmetros da paginação
function calcularPaginacao(query = {}) {

    const pagina = validarNumero(
        query.pagina ?? query.page,
        PAGINA_PADRAO
    );

    let limite = validarNumero(
        query.limite ?? query.limit,
        LIMITE_PADRAO
    );

    // Impedir carregamento excessivo
    limite = Math.min(limite, LIMITE_MAXIMO);

    // Calcular OFFSET
    const offset = (pagina - 1) * limite;

    if (!Number.isSafeInteger(offset)) {
        throw new Error('Número de página demasiado elevado.');
    }

    return {
        pagina,
        limite,
        offset
    };
}

// Calcular total de páginas
function calcularTotalPaginas(totalRegistos, limite) {

    if (
        !Number.isSafeInteger(totalRegistos) ||
        totalRegistos < 0
    ) {
        throw new Error('Total de registos inválido.');
    }

    if (
        !Number.isSafeInteger(limite) ||
        limite < 1
    ) {
        throw new Error('Limite de paginação inválido.');
    }

    return Math.ceil(totalRegistos / limite);
}

// Criar metadados da paginação
function criarMetadados(totalRegistos, pagina, limite) {

    const totalPaginas = calcularTotalPaginas(
        totalRegistos,
        limite
    );

    return {
        pagina,
        limite,
        totalRegistos,
        totalPaginas,

        paginaAnterior: pagina > 1
            ? pagina - 1
            : null,

        proximaPagina: pagina < totalPaginas
            ? pagina + 1
            : null,

        temPaginaAnterior: pagina > 1,

        temProximaPagina: pagina < totalPaginas
    };
}

// Organizar resposta paginada
function respostaPaginada(
    dados,
    totalRegistos,
    pagina,
    limite
) {

    if (!Array.isArray(dados)) {
        throw new Error('Os dados devem ser um array.');
    }

    const metadados = criarMetadados(
        totalRegistos,
        pagina,
        limite
    );

    return {
        dados,
        paginacao: metadados
    };
}

// Exportar funções
module.exports = {
    calcularPaginacao,
    calcularTotalPaginas,
    criarMetadados,
    respostaPaginada
};
