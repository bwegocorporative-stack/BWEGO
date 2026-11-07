
/**
 * BWÉ GO
 * UTILITÁRIO: RESPOSTAS DA API
 *
 * Padroniza as respostas enviadas pelo Express.
 */

function enviarResposta(
    res,
    status,
    sucesso,
    mensagem,
    dados = null,
    extras = {}
) {
    return res.status(status).json({
        sucesso,
        mensagem,
        dados,
        ...extras
    });
}

/**
 * Resposta de sucesso
 */
function sucesso(
    res,
    mensagem = 'Operação realizada com sucesso.',
    dados = null,
    status = 200,
    extras = {}
) {
    return enviarResposta(
        res,
        status,
        true,
        mensagem,
        dados,
        extras
    );
}

/**
 * Resposta de criação
 */
function criado(
    res,
    mensagem = 'Registo criado com sucesso.',
    dados = null
) {
    return sucesso(res, mensagem, dados, 201);
}

/**
 * Resposta de atualização
 */
function atualizado(
    res,
    mensagem = 'Registo atualizado com sucesso.',
    dados = null
) {
    return sucesso(res, mensagem, dados, 200);
}

/**
 * Resposta de eliminação
 */
function eliminado(
    res,
    mensagem = 'Registo eliminado com sucesso.',
    dados = null
) {
    return sucesso(res, mensagem, dados, 200);
}

/**
 * Resposta de erro
 */
function erro(
    res,
    mensagem = 'Ocorreu um erro no servidor.',
    status = 500,
    detalhes = null
) {
    const resposta = {
        sucesso: false,
        mensagem
    };

    if (detalhes !== null) {
        resposta.detalhes = detalhes;
    }

    return res.status(status).json(resposta);
}

/**
 * Erro de validação
 */
function erroValidacao(
    res,
    mensagem = 'Os dados fornecidos são inválidos.',
    detalhes = null
) {
    return erro(res, mensagem, 400, detalhes);
}

/**
 * Não autorizado
 */
function naoAutorizado(
    res,
    mensagem = 'É necessário iniciar sessão.'
) {
    return erro(res, mensagem, 401);
}

/**
 * Acesso proibido
 */
function proibido(
    res,
    mensagem = 'Não tens permissão para realizar esta operação.'
) {
    return erro(res, mensagem, 403);
}

/**
 * Registo não encontrado
 */
function naoEncontrado(
    res,
    mensagem = 'Registo não encontrado.'
) {
    return erro(res, mensagem, 404);
}

/**
 * Conflito de dados
 */
function conflito(
    res,
    mensagem = 'Já existe um registo com estes dados.'
) {
    return erro(res, mensagem, 409);
}

/**
 * Erro interno do servidor
 */
function erroServidor(
    res,
    mensagem = 'Ocorreu um erro interno no servidor.'
) {
    return erro(res, mensagem, 500);
}

/**
 * Resposta de paginação
 *
 * Compatível com src/utils/paginacao.js
 */
function respostaPaginada(
    res,
    dados,
    totalRegistos,
    pagina,
    limite,
    mensagem = 'Dados carregados com sucesso.'
) {
    const totalPaginas = Math.ceil(
        totalRegistos / limite
    );

    return sucesso(
        res,
        mensagem,
        dados,
        200,
        {
            paginacao: {
                pagina,
                limite,
                totalRegistos,
                totalPaginas,
                paginaAnterior: pagina > 1 ? pagina - 1 : null,
                proximaPagina:
                    pagina < totalPaginas ? pagina + 1 : null,
                temPaginaAnterior: pagina > 1,
                temProximaPagina: pagina < totalPaginas
            }
        }
    );
}

module.exports = {
    enviarResposta,
    sucesso,
    criado,
    atualizado,
    eliminado,
    erro,
    erroValidacao,
    naoAutorizado,
    proibido,
    naoEncontrado,
    conflito,
    erroServidor,
    respostaPaginada
};
