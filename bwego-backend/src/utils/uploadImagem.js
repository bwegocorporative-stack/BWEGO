
/**
 * BWÉ GO
 * UTILITÁRIO: UPLOAD DE IMAGENS
 *
 * Armazenamento de imagens no Cloudinary.
 */

const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB

const FORMATOS_PERMITIDOS = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
];

/**
 * Validar imagem recebida
 */
function validarImagem(file) {

    if (!file) {
        throw new Error('Nenhuma imagem foi enviada.');
    }

    if (!file.mimetype || !FORMATOS_PERMITIDOS.includes(file.mimetype)) {
        throw new Error(
            'Formato inválido. Utilize JPG, JPEG, PNG, WEBP ou GIF.'
        );
    }

    if (!file.size || file.size <= 0) {
        throw new Error('A imagem está vazia ou é inválida.');
    }

    if (file.size > TAMANHO_MAXIMO) {
        throw new Error('A imagem ultrapassa o limite de 5 MB.');
    }

    if (!file.buffer && !file.path) {
        throw new Error('Não foi possível identificar o ficheiro recebido.');
    }

    return true;
}

/**
 * Carregar imagem através de um buffer
 */
function carregarBuffer(buffer, opcoes) {

    return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
            opcoes,
            (erro, resultado) => {

                if (erro) {
                    return reject(erro);
                }

                if (!resultado) {
                    return reject(
                        new Error('O Cloudinary não devolveu um resultado.')
                    );
                }

                resolve(resultado);
            }
        );

        Readable.from(buffer).pipe(stream);
    });
}

/**
 * Normalizar resultado do Cloudinary
 */
function formatarResultado(resultado) {

    return {
        public_id: resultado.public_id,
        url: resultado.secure_url,
        formato: resultado.format,
        tamanho: resultado.bytes,
        largura: resultado.width,
        altura: resultado.height,
        resource_type: resultado.resource_type
    };
}

/**
 * Upload de uma imagem
 *
 * @param {Object} file - Ficheiro recebido pelo Multer
 * @param {String} pasta - Pasta de destino no Cloudinary
 * @param {Object} opcoes - Configurações adicionais
 */

async function uploadImagem(file, pasta = 'bwego', opcoes = {}) {

    validarImagem(file);

    if (typeof pasta !== 'string' || !pasta.trim()) {
        throw new Error('A pasta de destino é obrigatória.');
    }

    const configuracoes = {
        folder: pasta.trim(),
        resource_type: 'image',
        unique_filename: true,
        overwrite: false,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        ...opcoes
    };

    try {

        let resultado;

        if (file.buffer) {

            resultado = await carregarBuffer(
                file.buffer,
                configuracoes
            );

        } else if (file.path) {

            resultado = await cloudinary.uploader.upload(
                file.path,
                configuracoes
            );
        }

        return {
            sucesso: true,
            mensagem: 'Imagem carregada com sucesso.',
            imagem: formatarResultado(resultado)
        };

    } catch (erro) {

        console.error('Erro no upload da imagem:', erro.message);

        throw new Error(
            `Não foi possível carregar a imagem: ${erro.message}`
        );
    }
}

/**
 * Upload de várias imagens
 *
 * @param {Array} files - Lista de ficheiros
 * @param {String} pasta - Pasta de destino
 * @param {Object} opcoes - Configurações adicionais
 */

async function uploadVariasImagens(
    files,
    pasta = 'bwego',
    opcoes = {}
) {

    if (!Array.isArray(files)) {
        throw new Error('Os ficheiros devem ser enviados num array.');
    }

    if (files.length === 0) {
        return {
            sucesso: true,
            total: 0,
            carregadas: 0,
            falhas: 0,
            imagens: [],
            erros: []
        };
    }

    if (files.length > 10) {
        throw new Error('O máximo permitido é de 10 imagens por operação.');
    }

    // Validar todas antes de iniciar os uploads
    files.forEach(validarImagem);

    const resultados = await Promise.allSettled(
        files.map(file => uploadImagem(file, pasta, opcoes))
    );

    const imagens = [];
    const erros = [];

    resultados.forEach((resultado, indice) => {

        if (resultado.status === 'fulfilled') {

            imagens.push(resultado.value.imagem);

        } else {

            erros.push({
                indice,
                mensagem: resultado.reason.message
            });
        }
    });

    return {
        sucesso: erros.length === 0,
        total: files.length,
        carregadas: imagens.length,
        falhas: erros.length,
        imagens,
        erros
    };
}

module.exports = {
    validarImagem,
    uploadImagem,
    uploadVariasImagens
};
