
/**
 * BWÉ GO
 * UTILITÁRIO: REMOVER IMAGENS DO CLOUDINARY
 *
 * Responsável por:
 * - Eliminar imagens do Cloudinary.
 * - Eliminar várias imagens.
 * - Verificar se a imagem foi removida.
 * - Tratar erros durante a eliminação.
 *
 * IMPORTANTE:
 * Utilizar o public_id guardado na base de dados.
 */

const cloudinary = require('../config/cloudinary');

/**
 * Remover uma imagem do Cloudinary
 *
 * @param {string} publicId - Identificador da imagem
 * @param {object} opcoes - Configurações adicionais
 */

async function removerImagem(publicId, opcoes = {}) {

    if (
        typeof publicId !== 'string' ||
        !publicId.trim()
    ) {
        throw new Error('O public_id da imagem é obrigatório.');
    }

    const {
        resourceType = 'image',
        invalidate = true
    } = opcoes;

    const tiposPermitidos = ['image', 'video', 'raw'];

    if (!tiposPermitidos.includes(resourceType)) {
        throw new Error('Tipo de recurso inválido.');
    }

    try {

        const resultado = await cloudinary.uploader.destroy(
            publicId.trim(),
            {
                resource_type: resourceType,
                type: 'upload',
                invalidate
            }
        );

        if (resultado.result === 'ok') {

            return {
                sucesso: true,
                removida: true,
                public_id: publicId,
                mensagem: 'Imagem removida com sucesso.'
            };
        }

        if (resultado.result === 'not found') {

            return {
                sucesso: true,
                removida: false,
                public_id: publicId,
                mensagem: 'A imagem não foi encontrada no Cloudinary.'
            };
        }

        throw new Error(
            resultado.result || 'Não foi possível remover a imagem.'
        );

    } catch (erro) {

        console.error(
            'Erro ao remover imagem do Cloudinary:',
            erro.message
        );

        throw new Error(
            `Falha ao remover imagem: ${erro.message}`
        );
    }
}

/**
 * Remover várias imagens do Cloudinary
 *
 * @param {Array} publicIds - Lista de public_ids
 * @param {object} opcoes - Configurações adicionais
 */

async function removerVariasImagens(publicIds, opcoes = {}) {

    if (!Array.isArray(publicIds)) {
        throw new Error('A lista de imagens deve ser um array.');
    }

    if (publicIds.length === 0) {
        return {
            sucesso: true,
            total: 0,
            removidas: 0,
            falhas: 0,
            resultados: []
        };
    }

    // Eliminar identificadores repetidos
    const identificadores = [
        ...new Set(publicIds.filter(
            id => typeof id === 'string' && id.trim()
        ))
    ];

    const resultados = await Promise.allSettled(
        identificadores.map(publicId =>
            removerImagem(publicId, opcoes)
        )
    );

    const detalhes = resultados.map((resultado, indice) => {

        if (resultado.status === 'fulfilled') {
            return resultado.value;
        }

        return {
            sucesso: false,
            removida: false,
            public_id: identificadores[indice],
            mensagem: resultado.reason.message
        };
    });

    const removidas = detalhes.filter(
        item => item.removida
    ).length;

    const falhas = detalhes.filter(
        item => !item.sucesso
    ).length;

    return {
        sucesso: falhas === 0,
        total: identificadores.length,
        removidas,
        falhas,
        resultados: detalhes
    };
}

module.exports = {
    removerImagem,
    removerVariasImagens
};
