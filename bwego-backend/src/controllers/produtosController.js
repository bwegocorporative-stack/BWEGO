
const db = require('../config/db');
const cloudinary = require('../config/cloudinary');

async function obterColunasProdutos() {
    const [colunas] = await db.query('SHOW COLUMNS FROM produtos');
    return new Set(colunas.map(({ Field }) => Field));
}

function obterColunaImagemProduto(colunas) {
    if (colunas.has('imagem_url')) return 'imagem_url';
    if (colunas.has('imagem_principal')) return 'imagem_principal';
    throw new Error('A tabela produtos não possui uma coluna para a imagem.');
}

exports.listarCategorias = async (req, res) => {
    try {
        const { pesquisa } = req.query;
        const colunasProdutos = await obterColunasProdutos();
        const tabelaCategorias = await db.query("SHOW TABLES LIKE 'categorias_produtos'");
        if (!tabelaCategorias[0].length && colunasProdutos.has('categoria')) {
            let sql = `
                SELECT DISTINCT categoria AS nome
                FROM produtos
                WHERE categoria IS NOT NULL AND TRIM(categoria) <> ''
            `;
            const valores = [];
            if (pesquisa) {
                sql += ' AND categoria LIKE ?';
                valores.push(`%${pesquisa}%`);
            }
            sql += ' ORDER BY nome ASC';
            const [linhas] = await db.execute(sql, valores);
            const categorias = linhas.map(({ nome }) => ({
                id: null,
                parceiro_id: null,
                nome,
                descricao: null,
                ativo: 1
            }));
            return res.status(200).json({
                sucesso: true,
                total: categorias.length,
                categorias
            });
        }

        let sql = `
            SELECT id, parceiro_id, nome, descricao, ativo, criado_em
            FROM categorias_produtos
            WHERE 1 = 1
        `;
        const valores = [];
        if (pesquisa) {
            sql += ' AND nome LIKE ?';
            valores.push(`%${pesquisa}%`);
        }
        sql += ' ORDER BY nome ASC';

        const [categorias] = await db.execute(sql, valores);
        return res.status(200).json({
            sucesso: true,
            total: categorias.length,
            categorias
        });
    } catch (error) {
        console.error('Erro ao listar categorias de produtos:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível carregar as categorias de produtos.'
        });
    }
};

exports.cadastrarCategoria = async (req, res) => {
    try {
        const { nome, descricao } = req.body || {};
        if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 120) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O nome da categoria é obrigatório e deve ter até 120 caracteres.'
            });
        }
        if (descricao !== undefined && descricao !== null &&
            (typeof descricao !== 'string' || descricao.length > 500)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A descrição da categoria deve ter até 500 caracteres.'
            });
        }

        const tabelaCategorias = await db.query("SHOW TABLES LIKE 'categorias_produtos'");
        if (!tabelaCategorias[0].length) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A criação de categorias requer a tabela categorias_produtos. Atualiza o esquema da base de dados.'
            });
        }

        const nomeCategoria = nome.trim();
        const [existentes] = await db.execute(
            `SELECT id
             FROM categorias_produtos
             WHERE parceiro_id IS NULL AND LOWER(nome) = LOWER(?)
             LIMIT 1`,
            [nomeCategoria]
        );
        if (existentes.length) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Já existe uma categoria geral com esse nome.'
            });
        }

        const [resultado] = await db.execute(
            `INSERT INTO categorias_produtos (parceiro_id, nome, descricao, ativo)
             VALUES (NULL, ?, ?, 1)`,
            [nomeCategoria, descricao?.trim() || null]
        );
        return res.status(201).json({
            sucesso: true,
            mensagem: 'Categoria criada com sucesso.',
            categoria_id: resultado.insertId
        });
    } catch (error) {
        console.error('Erro ao criar categoria de produtos:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível criar a categoria de produtos.'
        });
    }
};

exports.atualizarCategoria = async (req, res) => {
    try {
        const { id, nome_atual, nome, descricao } = req.body || {};
        if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 120) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O nome da categoria é obrigatório e deve ter até 120 caracteres.'
            });
        }
        if (descricao !== undefined && descricao !== null &&
            (typeof descricao !== 'string' || descricao.length > 500)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A descrição da categoria deve ter até 500 caracteres.'
            });
        }

        const tabelaCategorias = await db.query("SHOW TABLES LIKE 'categorias_produtos'");
        const nomeCategoria = nome.trim();
        if (tabelaCategorias[0].length) {
            const categoriaId = Number(id);
            if (!Number.isSafeInteger(categoriaId) || categoriaId < 1) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'O identificador da categoria é inválido.'
                });
            }
            const [existente] = await db.execute(
                `SELECT id
                 FROM categorias_produtos
                 WHERE id = ?
                 LIMIT 1`,
                [categoriaId]
            );
            if (!existente.length) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Categoria não encontrada.'
                });
            }
            const [duplicada] = await db.execute(
                `SELECT id
                 FROM categorias_produtos
                 WHERE parceiro_id IS NULL AND LOWER(nome) = LOWER(?) AND id <> ?
                 LIMIT 1`,
                [nomeCategoria, categoriaId]
            );
            if (duplicada.length) {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: 'Já existe outra categoria geral com esse nome.'
                });
            }

            const campos = ['nome = ?'];
            const valores = [nomeCategoria];
            if (descricao !== undefined) {
                campos.push('descricao = ?');
                valores.push(descricao.trim() || null);
            }
            valores.push(categoriaId);
            await db.execute(
                `UPDATE categorias_produtos SET ${campos.join(', ')} WHERE id = ?`,
                valores
            );
            return res.status(200).json({
                sucesso: true,
                mensagem: 'Categoria atualizada com sucesso.'
            });
        }

        const colunasProdutos = await obterColunasProdutos();
        if (!colunasProdutos.has('categoria') || typeof nome_atual !== 'string' || !nome_atual.trim()) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível identificar esta categoria no esquema atual.'
            });
        }
        if (descricao !== undefined) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A descrição não está disponível para categorias guardadas diretamente nos produtos.'
            });
        }
        const [resultado] = await db.execute(
            `UPDATE produtos SET categoria = ? WHERE LOWER(categoria) = LOWER(?)`,
            [nomeCategoria, nome_atual.trim()]
        );
        if (!resultado.affectedRows) {
            const [existente] = await db.execute(
                `SELECT id FROM produtos WHERE LOWER(categoria) = LOWER(?) LIMIT 1`,
                [nomeCategoria]
            );
            if (!existente.length) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Não foram encontrados produtos nesta categoria.'
                });
            }
        }
        return res.status(200).json({
            sucesso: true,
            mensagem: 'Categoria atualizada nos produtos com sucesso.'
        });
    } catch (error) {
        console.error('Erro ao atualizar categoria de produtos:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível atualizar a categoria de produtos.'
        });
    }
};

// ============================================
// BWÉ GO
// CONTROLLER: PRODUTOS
// ============================================


// ============================================
// CADASTRAR PRODUTO
// ============================================

exports.cadastrarProduto = async (req, res) => {
    try {
        const {
            parceiro_id,
            categoria_id,
            categoria_nome,
            nome,
            descricao,
            preco,
            preco_promocional,
            unidade,
            codigo_barras
        } = req.body;

        const parceiroId = Number(parceiro_id);
        const precoNumerico = Number(preco);
        if (
            !Number.isSafeInteger(parceiroId) ||
            parceiroId < 1 ||
            typeof nome !== 'string' ||
            !nome.trim() ||
            nome.trim().length > 200 ||
            preco === undefined ||
            !Number.isFinite(precoNumerico) ||
            precoNumerico < 0
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Parceiro, nome e preço válido são obrigatórios.'
            });
        }

        const [colunasProdutos, [colunasParceiros], tabelaCategorias] = await Promise.all([
            obterColunasProdutos(),
            db.query('SHOW COLUMNS FROM parceiros'),
            db.query("SHOW TABLES LIKE 'categorias_produtos'")
        ]);
        const camposParceiros = new Set(colunasParceiros.map(({ Field }) => Field));
        const categoriasDisponiveis = tabelaCategorias[0].length > 0;
        const colunaEstadoParceiro = camposParceiros.has('ativo')
            ? 'ativo = 1'
            : camposParceiros.has('estado_aprovacao')
                ? "estado_aprovacao = 'aprovado'"
                : '1 = 1';

        const [parceiros] = await db.execute(
            `SELECT id
             FROM parceiros
             WHERE id = ? AND ${colunaEstadoParceiro}`,
            [parceiroId]
        );

        if (parceiros.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Parceiro não encontrado ou inativo.'
            });
        }

        let categoriaId = null;
        let nomeCategoria = typeof categoria_nome === 'string'
            ? categoria_nome.trim()
            : '';
        if (colunasProdutos.has('categoria_id')) {
            categoriaId = categoria_id ? Number(categoria_id) : null;
            if (!categoriaId && nomeCategoria) {
                if (!categoriasDisponiveis) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: 'A tabela de categorias não está disponível. Cria ou seleciona uma categoria existente.'
                    });
                }
                if (nomeCategoria.length > 120) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: 'O nome da categoria não pode ultrapassar 120 caracteres.'
                    });
                }
                const [categoriasExistentes] = await db.execute(
                    `SELECT id
                     FROM categorias_produtos
                     WHERE (parceiro_id = ? OR parceiro_id IS NULL) AND LOWER(nome) = LOWER(?)
                     LIMIT 1`,
                    [parceiroId, nomeCategoria]
                );
                if (categoriasExistentes.length) {
                    categoriaId = categoriasExistentes[0].id;
                } else {
                    const [categoriaCriada] = await db.execute(
                        `INSERT INTO categorias_produtos (parceiro_id, nome, ativo)
                         VALUES (?, ?, TRUE)`,
                        [parceiroId, nomeCategoria]
                    );
                    categoriaId = categoriaCriada.insertId;
                }
            }

            if (!Number.isSafeInteger(categoriaId) || categoriaId < 1) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Indica uma categoria válida para o produto.'
                });
            }

            const [categorias] = await db.execute(
                `SELECT id
                 FROM categorias_produtos
                 WHERE id = ? AND (parceiro_id = ? OR parceiro_id IS NULL)`,
                [categoriaId, parceiroId]
            );
            if (categorias.length === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Categoria não encontrada.'
                });
            }
        } else {
            if (!nomeCategoria && categoria_id !== undefined && categoria_id !== null) {
                const categoriaIdTexto = String(categoria_id).trim();
                if (categoriaIdTexto && !/^\d+$/.test(categoriaIdTexto)) {
                    nomeCategoria = categoriaIdTexto;
                } else if (categoriaIdTexto && categoriasDisponiveis) {
                    const [categorias] = await db.execute(
                        `SELECT nome
                         FROM categorias_produtos
                         WHERE id = ? AND (parceiro_id = ? OR parceiro_id IS NULL)
                         LIMIT 1`,
                        [Number(categoriaIdTexto), parceiroId]
                    );
                    nomeCategoria = categorias[0]?.nome || '';
                }
            }
            if (!nomeCategoria || nomeCategoria.length > 150) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Indica uma categoria válida para o produto.'
                });
            }
        }

        const precoPromocional = preco_promocional !== undefined &&
            preco_promocional !== null &&
            preco_promocional !== ''
            ? Number(preco_promocional)
            : null;
        if (
            precoPromocional !== null &&
            (!Number.isFinite(precoPromocional) ||
                precoPromocional < 0 ||
                precoPromocional > precoNumerico)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O preço promocional deve ser válido e não pode superar o preço normal.'
            });
        }

        const colunaImagem = obterColunaImagemProduto(colunasProdutos);
        const dadosProduto = {
            parceiro_id: parceiroId,
            categoria_id: categoriaId,
            categoria: nomeCategoria,
            nome: nome.trim(),
            descricao: descricao || null,
            preco: precoNumerico,
            preco_promocional: precoPromocional,
            unidade: unidade || 'unidade',
            unidade_medida: unidade || 'unidade',
            codigo_barras: codigo_barras || null,
            codigo_produto: codigo_barras || null,
            [colunaImagem]: req.file?.path || null,
            ativo: 1,
            estado: 'ativo'
        };
        const colunasInsert = Object.keys(dadosProduto).filter((campo) =>
            colunasProdutos.has(campo)
        );
        const valoresInsert = colunasInsert.map((campo) => dadosProduto[campo]);
        if (colunasProdutos.has('imagem_public_id')) {
            colunasInsert.push('imagem_public_id');
            valoresInsert.push(req.file?.filename || null);
        }

        const [resultado] = await db.execute(
            `INSERT INTO produtos (${colunasInsert.join(', ')})
             VALUES (${colunasInsert.map(() => '?').join(', ')})`,
            valoresInsert
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Produto cadastrado com sucesso.',
            produto_id: resultado.insertId,
            imagem_url: req.file?.path || null
        });

    } catch (error) {
        console.error('Erro ao cadastrar produto:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar produto.'
        });
    }
};


// ============================================
// LISTAR PRODUTOS
// ============================================

exports.listarProdutos = async (req, res) => {
    try {
        const {
            parceiro_id,
            categoria_id,
            pesquisa,
            ativo,
            pagina = 1,
            limite = 20
        } = req.query;
        const [colunasProdutos, [colunasParceiros]] = await Promise.all([
            obterColunasProdutos(),
            db.query('SHOW COLUMNS FROM parceiros')
        ]);
        const camposParceiros = new Set(colunasParceiros.map(({ Field }) => Field));
        const colunaImagem = obterColunaImagemProduto(colunasProdutos);
        const colunaImagemPublicId = colunasProdutos.has('imagem_public_id')
            ? 'p.imagem_public_id'
            : 'NULL AS imagem_public_id';
        const colunaCategoria = colunasProdutos.has('categoria_id')
            ? 'p.categoria_id'
            : 'NULL';
        const colunaNomeCategoria = colunasProdutos.has('categoria_id')
            ? 'c.nome'
            : colunasProdutos.has('categoria')
                ? 'p.categoria'
                : 'NULL';
        const colunaUnidade = colunasProdutos.has('unidade')
            ? 'p.unidade'
            : colunasProdutos.has('unidade_medida')
                ? 'p.unidade_medida'
                : 'NULL';
        const colunaCodigoBarras = colunasProdutos.has('codigo_barras')
            ? 'p.codigo_barras'
            : colunasProdutos.has('codigo_produto')
                ? 'p.codigo_produto'
                : 'NULL';
        const colunaAtivo = colunasProdutos.has('ativo')
            ? 'p.ativo'
            : colunasProdutos.has('estado')
                ? "CASE WHEN p.estado = 'ativo' THEN 1 ELSE 0 END"
                : '1';
        const colunaEstado = colunasProdutos.has('estado')
            ? 'p.estado'
            : colunasProdutos.has('ativo')
                ? "CASE WHEN p.ativo = 1 THEN 'ativo' ELSE 'inativo' END"
                : "'ativo'";
        const colunaCriadoEm = ['criado_em', 'data_cadastro', 'created_at']
            .find((coluna) => colunasProdutos.has(coluna));
        const colunaAtualizadoEm = ['atualizado_em', 'data_atualizacao', 'updated_at']
            .find((coluna) => colunasProdutos.has(coluna));
        const colunaNomeParceiro = camposParceiros.has('nome_comercial')
            ? 'par.nome_comercial'
            : 'par.nome';
        const joinCategoria = colunasProdutos.has('categoria_id')
            ? `LEFT JOIN categorias_produtos c ON c.id = p.categoria_id`
            : '';

        const page = Math.max(1, Number(pagina));
        const limit = Math.min(100, Math.max(1, Number(limite)));
        const offset = (page - 1) * limit;

        let sql = `
            SELECT
                p.id,
                p.parceiro_id,
                ${colunaCategoria} AS categoria_id,
                p.nome,
                p.descricao,
                p.preco,
                p.preco_promocional,
                ${colunaUnidade} AS unidade,
                ${colunaCodigoBarras} AS codigo_barras,
                p.${colunaImagem} AS imagem_url,
                ${colunaImagemPublicId},
                ${colunaAtivo} AS ativo,
                ${colunaEstado} AS estado,
                ${colunaCriadoEm ? `p.${colunaCriadoEm}` : 'NULL'} AS criado_em,
                ${colunaAtualizadoEm ? `p.${colunaAtualizadoEm}` : 'NULL'} AS atualizado_em,
                ${colunaNomeParceiro} AS parceiro_nome,
                ${colunaNomeCategoria} AS categoria_nome
            FROM produtos p
            INNER JOIN parceiros par
                ON par.id = p.parceiro_id
            ${joinCategoria}
            WHERE 1 = 1
        `;

        const valores = [];

        if (parceiro_id) {
            sql += ` AND p.parceiro_id = ?`;
            valores.push(parceiro_id);
        }

        if (categoria_id) {
            if (!colunasProdutos.has('categoria_id')) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'A filtragem por ID de categoria não está disponível neste esquema de produtos.'
                });
            }
            sql += ` AND p.categoria_id = ?`;
            valores.push(categoria_id);
        }

        if (pesquisa) {
            sql += ` AND p.nome LIKE ?`;
            valores.push(`%${pesquisa}%`);
        }

        if (ativo !== undefined) {
            if (!['0', '1'].includes(String(ativo))) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'O parâmetro ativo deve ser 0 ou 1.'
                });
            }

            if (colunasProdutos.has('ativo')) {
                sql += ` AND p.ativo = ?`;
                valores.push(Number(ativo));
            } else if (colunasProdutos.has('estado')) {
                sql += Number(ativo) === 1
                    ? ` AND p.estado = 'ativo'`
                    : ` AND p.estado <> 'ativo'`;
            }
        }

        sql += ` ORDER BY p.${colunaCriadoEm || 'id'} DESC LIMIT ? OFFSET ?`;

        valores.push(limit, offset);

        const [produtos] = await db.execute(sql, valores);

        return res.status(200).json({
            sucesso: true,
            pagina: page,
            limite: limit,
            total: produtos.length,
            produtos
        });

    } catch (error) {
        console.error('Erro ao listar produtos:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar produtos.'
        });
    }
};


// ============================================
// BUSCAR PRODUTO POR ID
// ============================================

exports.buscarProdutoPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const [produtos] = await db.execute(
            `SELECT
                p.*,
                par.nome_comercial AS parceiro_nome,
                c.nome AS categoria_nome
             FROM produtos p
             INNER JOIN parceiros par
                ON par.id = p.parceiro_id
             INNER JOIN categorias_produtos c
                ON c.id = p.categoria_id
             WHERE p.id = ?`,
            [id]
        );

        if (produtos.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Produto não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            produto: produtos[0]
        });

    } catch (error) {
        console.error('Erro ao buscar produto:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar produto.'
        });
    }
};


// ============================================
// ATUALIZAR PRODUTO
// ============================================

exports.atualizarProduto = async (req, res) => {
    try {
        const { id } = req.params;
        const colunasProdutos = await obterColunasProdutos();
        const [produtosExistentes] = await db.execute(
            `SELECT
                parceiro_id,
                preco,
                ${colunasProdutos.has('preco_promocional') ? 'preco_promocional' : 'NULL AS preco_promocional'},
                ${colunasProdutos.has('imagem_public_id') ? 'imagem_public_id' : 'NULL AS imagem_public_id'}
             FROM produtos
             WHERE id = ?
             LIMIT 1`,
            [id]
        );
        const produtoExistente = produtosExistentes[0];
        if (!produtoExistente) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Produto não encontrado.'
            });
        }

        const campos = [];
        const valores = [];
        const adicionarCampo = (campo, valor) => {
            campos.push(`${campo} = ?`);
            valores.push(valor);
        };

        if (req.body.nome !== undefined &&
            (typeof req.body.nome !== 'string' || !req.body.nome.trim() || req.body.nome.trim().length > 200)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O nome do produto é obrigatório e não pode ultrapassar 200 caracteres.'
            });
        }
        if (req.body.nome !== undefined && colunasProdutos.has('nome')) {
            adicionarCampo('nome', req.body.nome.trim());
        }
        if (req.body.descricao !== undefined &&
            req.body.descricao !== null &&
            typeof req.body.descricao !== 'string') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A descrição do produto deve ser texto.'
            });
        }
        if (req.body.descricao !== undefined && colunasProdutos.has('descricao')) {
            adicionarCampo('descricao', req.body.descricao?.trim() || null);
        }
        for (const campo of ['preco', 'preco_promocional']) {
            if (req.body[campo] === undefined) continue;
            const colunaExiste = colunasProdutos.has(campo);
            if (!colunaExiste) continue;
            if (campo === 'preco_promocional' && (req.body[campo] === null || req.body[campo] === '')) {
                adicionarCampo(campo, null);
                continue;
            }
            if (
                campo === 'preco' &&
                (req.body[campo] === null ||
                    (typeof req.body[campo] === 'string' && !req.body[campo].trim()))
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'O preço do produto é obrigatório.'
                });
            }
            const preco = Number(req.body[campo]);
            if (!Number.isFinite(preco) || preco < 0) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Os preços do produto devem ser números iguais ou superiores a zero.'
                });
            }
            adicionarCampo(campo, preco);
        }
        const precoFinal = req.body.preco === undefined
            ? Number(produtoExistente.preco)
            : Number(req.body.preco);
        const precoPromocionalFinal = req.body.preco_promocional === undefined
            ? produtoExistente.preco_promocional == null
                ? null
                : Number(produtoExistente.preco_promocional)
            : req.body.preco_promocional === null || req.body.preco_promocional === ''
                ? null
                : Number(req.body.preco_promocional);
        if (
            precoPromocionalFinal !== null &&
            (!Number.isFinite(precoPromocionalFinal) || precoPromocionalFinal > precoFinal)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O preço promocional não pode superar o preço normal.'
            });
        }
        if (req.body.unidade !== undefined &&
            (typeof req.body.unidade !== 'string' || req.body.unidade.length > 50)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A unidade do produto é inválida.'
            });
        }
        if (req.body.unidade !== undefined) {
            const colunaUnidade = ['unidade', 'unidade_medida']
                .find((coluna) => colunasProdutos.has(coluna));
            if (colunaUnidade) adicionarCampo(colunaUnidade, req.body.unidade);
        }
        if (req.body.codigo_barras !== undefined &&
            (typeof req.body.codigo_barras !== 'string' || req.body.codigo_barras.length > 100)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O código de barras é inválido.'
            });
        }
        if (req.body.codigo_barras !== undefined) {
            const colunaCodigo = ['codigo_barras', 'codigo_produto']
                .find((coluna) => colunasProdutos.has(coluna));
            if (colunaCodigo) adicionarCampo(colunaCodigo, req.body.codigo_barras || null);
        }

        if (req.body.categoria_nome !== undefined) {
            const nomeCategoria = typeof req.body.categoria_nome === 'string'
                ? req.body.categoria_nome.trim()
                : '';
            if (!nomeCategoria || nomeCategoria.length > 150) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'A categoria é obrigatória e não pode ultrapassar 150 caracteres.'
                });
            }
            if (colunasProdutos.has('categoria')) {
                adicionarCampo('categoria', nomeCategoria);
            } else if (colunasProdutos.has('categoria_id')) {
                const tabelaCategorias = await db.query("SHOW TABLES LIKE 'categorias_produtos'");
                if (!tabelaCategorias[0].length) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: 'A tabela de categorias não está disponível.'
                    });
                }
                const [categorias] = await db.execute(
                    `SELECT id
                     FROM categorias_produtos
                     WHERE (parceiro_id = ? OR parceiro_id IS NULL) AND LOWER(nome) = LOWER(?)
                     LIMIT 1`,
                    [produtoExistente.parceiro_id, nomeCategoria]
                );
                let categoriaId = categorias[0]?.id;
                if (!categoriaId) {
                    const [criada] = await db.execute(
                        `INSERT INTO categorias_produtos (parceiro_id, nome, ativo)
                         VALUES (?, ?, 1)`,
                        [produtoExistente.parceiro_id, nomeCategoria]
                    );
                    categoriaId = criada.insertId;
                }
                adicionarCampo('categoria_id', categoriaId);
            }
        } else if (req.body.categoria_id !== undefined && colunasProdutos.has('categoria_id')) {
            const categoriaId = Number(req.body.categoria_id);
            if (!Number.isSafeInteger(categoriaId) || categoriaId < 1) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'A categoria selecionada é inválida.'
                });
            }
            adicionarCampo('categoria_id', categoriaId);
        }

        let imagemAntiga = null;
        const colunaImagem = obterColunaImagemProduto(colunasProdutos);
        imagemAntiga = produtoExistente.imagem_public_id;

        if (req.file) {
            adicionarCampo(colunaImagem, req.file.path);
            if (colunasProdutos.has('imagem_public_id')) {
                adicionarCampo('imagem_public_id', req.file.filename);
            }
        }

        if (campos.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nenhum campo enviado para atualização.'
            });
        }

        valores.push(id);

        const [resultado] = await db.execute(
            `UPDATE produtos
             SET ${campos.join(', ')}
             WHERE id = ?`,
            valores
        );

        if (resultado.affectedRows === 0) {
            const [existente] = await db.execute(
                'SELECT id FROM produtos WHERE id = ? LIMIT 1',
                [id]
            );
            if (!existente.length) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Produto não encontrado.'
                });
            }
        }

        // Eliminar imagem antiga somente depois de atualizar a base de dados
        if (
            req.file &&
            imagemAntiga &&
            imagemAntiga !== req.file.filename
        ) {
            try {
                await cloudinary.uploader.destroy(imagemAntiga);
            } catch (cloudinaryError) {
                console.error(
                    'Erro ao eliminar imagem antiga:',
                    cloudinaryError
                );
            }
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Produto atualizado com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao atualizar produto:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar produto.'
        });
    }
};


// ============================================
// ELIMINAR CATEGORIA
// ============================================

exports.eliminarCategoria = async (req, res) => {
    try {
        const { id, nome } = req.query;
        const tabelaCategorias = await db.query("SHOW TABLES LIKE 'categorias_produtos'");

        if (tabelaCategorias[0].length) {
            const categoriaId = Number(id);
            if (!Number.isSafeInteger(categoriaId) || categoriaId < 1) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'O identificador da categoria é inválido.'
                });
            }

            const [categorias] = await db.execute(
                'SELECT id FROM categorias_produtos WHERE id = ? LIMIT 1',
                [categoriaId]
            );
            if (!categorias.length) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Categoria não encontrada.'
                });
            }

            const colunasProdutos = await obterColunasProdutos();
            if (colunasProdutos.has('categoria_id')) {
                const [produtos] = await db.execute(
                    'SELECT id FROM produtos WHERE categoria_id = ? LIMIT 1',
                    [categoriaId]
                );
                if (produtos.length) {
                    return res.status(409).json({
                        sucesso: false,
                        mensagem: 'Esta categoria está associada a produtos. Altera a categoria desses produtos antes de a remover.'
                    });
                }
            }

            await db.execute('DELETE FROM categorias_produtos WHERE id = ?', [categoriaId]);
            return res.status(200).json({
                sucesso: true,
                mensagem: 'Categoria eliminada com sucesso.'
            });
        }

        const colunasProdutos = await obterColunasProdutos();
        if (!colunasProdutos.has('categoria') || typeof nome !== 'string' || !nome.trim()) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não é possível identificar esta categoria no esquema atual.'
            });
        }
        if (nome.trim().toLocaleLowerCase() === 'sem categoria') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A categoria "Sem categoria" é reservada e não pode ser removida.'
            });
        }

        const [resultado] = await db.execute(
            `UPDATE produtos
             SET categoria = 'Sem categoria'
             WHERE LOWER(categoria) = LOWER(?)`,
            [nome.trim()]
        );
        if (!resultado.affectedRows) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Categoria não encontrada.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Categoria removida. Os produtos associados foram mantidos como "Sem categoria".'
        });
    } catch (error) {
        console.error('Erro ao eliminar categoria de produtos:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível eliminar a categoria.'
        });
    }
};


// ============================================
// ATIVAR / DESATIVAR PRODUTO
// ============================================

exports.alterarEstadoProduto = async (req, res) => {
    try {
        const { id } = req.params;
        const { ativo } = req.body;

        if (![0, 1, false, true].includes(ativo)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O estado ativo deve ser 0 ou 1.'
            });
        }

        const [resultado] = await db.execute(
            `UPDATE produtos
             SET ativo = ?
             WHERE id = ?`,
            [Number(ativo), id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Produto não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: Number(ativo) === 1
                ? 'Produto ativado com sucesso.'
                : 'Produto desativado com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao alterar estado:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao alterar estado do produto.'
        });
    }
};


// ============================================
// ELIMINAR PRODUTO
// ============================================

exports.eliminarProduto = async (req, res) => {
    try {
        const { id } = req.params;
        const colunasProdutos = await obterColunasProdutos();
        const colunaImagemPublicId = colunasProdutos.has('imagem_public_id')
            ? 'imagem_public_id'
            : 'NULL AS imagem_public_id';

        const [produtos] = await db.execute(
            `SELECT ${colunaImagemPublicId}
             FROM produtos
             WHERE id = ?`,
            [id]
        );

        if (produtos.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Produto não encontrado.'
            });
        }

        const imagemPublicId = produtos[0].imagem_public_id;

        await db.execute(
            `DELETE FROM produtos
             WHERE id = ?`,
            [id]
        );

        if (imagemPublicId) {
            try {
                await cloudinary.uploader.destroy(imagemPublicId);
            } catch (cloudinaryError) {
                console.error(
                    'Erro ao eliminar imagem no Cloudinary:',
                    cloudinaryError
                );
            }
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Produto eliminado com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao eliminar produto:', error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este produto está associado a pedidos e não pode ser removido. Desativa-o para o ocultar sem perder o histórico.'
            });
        }

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao eliminar produto.'
        });
    }
};
