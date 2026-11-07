
const db = require('../config/db');

async function obterColunasParceiros() {
    const [colunas] = await db.query('SHOW COLUMNS FROM parceiros');
    return new Set(colunas.map(({ Field }) => Field));
}

function obterColunaImagem(colunas) {
    if (colunas.has('logo_url')) return 'logo_url';
    if (colunas.has('logotipo')) return 'logotipo';
    throw new Error('A tabela parceiros não possui uma coluna para a imagem de perfil.');
}

function selecionarColuna(colunas, candidatas, alias, valorPadrao = 'NULL') {
    const coluna = candidatas.find((candidata) => colunas.has(candidata));
    return `${coluna || valorPadrao} AS ${alias}`;
}

// ============================================
// BWÉ GO
// CONTROLLER: PARCEIROS
// ============================================


// ============================================
// CADASTRAR PARCEIRO
// ============================================

exports.cadastrarParceiro = async (req, res) => {
    try {
        const {
            usuario_id,
            nome_comercial,
            nome_empresa,
            nif,
            tipo_empresa,
            telefone,
            email,
            descricao,
            endereco,
            municipio,
            provincia,
            latitude,
            longitude,
            logo_url,
            logo_public_id
        } = req.body;

        const tiposEmpresa = [
            'supermercado',
            'farmacia',
            'restaurante',
            'loja',
            'mercearia',
            'distribuidor',
            'outros'
        ];
        if (
            typeof nome_comercial !== 'string' ||
            !nome_comercial.trim() ||
            nome_comercial.trim().length > 200 ||
            !tiposEmpresa.includes(tipo_empresa)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Introduza um nome comercial e um tipo de estabelecimento válido.'
            });
        }
        if (!telefone || typeof telefone !== 'string' || telefone.trim().length > 30) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Introduza um telefone válido para o estabelecimento.'
            });
        }
        if (!endereco || typeof endereco !== 'string' || !endereco.trim()) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O endereço do estabelecimento é obrigatório.'
            });
        }

        const colunasParceiros = await obterColunasParceiros();
        const colunaImagem = obterColunaImagem(colunasParceiros);
        const colunasInsert = [
            'usuario_id',
            'nome_comercial',
            'nome_empresa',
            'nif',
            'tipo_empresa',
            'telefone',
            'email',
            'descricao',
            'endereco',
            'municipio',
            'provincia',
            'latitude',
            'longitude',
            colunaImagem
        ];
        const valoresInsert = [
            usuario_id || null,
            nome_comercial.trim(),
            nome_empresa || null,
            nif || null,
            tipo_empresa,
            telefone.trim(),
            email || null,
            descricao || null,
            endereco.trim(),
            municipio || null,
            provincia || null,
            latitude || null,
            longitude || null,
            req.file?.path || logo_url || null
        ];
        if (colunasParceiros.has('logo_public_id')) {
            colunasInsert.push('logo_public_id');
            valoresInsert.push(req.file?.filename || logo_public_id || null);
        }

        const [resultado] = await db.execute(
            `INSERT INTO parceiros (${colunasInsert.join(', ')})
             VALUES (${colunasInsert.map(() => '?').join(', ')})`,
            valoresInsert
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Parceiro cadastrado com sucesso.',
            parceiro_id: resultado.insertId
        });

    } catch (error) {
        console.error('Erro ao cadastrar parceiro:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar parceiro.'
        });
    }
};


// ============================================
// LISTAR PARCEIROS
// ============================================

exports.listarParceiros = async (req, res) => {
    try {
        const {
            tipo_empresa: tipoEmpresaQuery,
            municipio,
            pesquisa,
            ativo
        } = req.query;
        const tipo_empresa = req.adminFarmaciasOnly
            ? 'farmacia'
            : tipoEmpresaQuery;
        const colunasParceiros = await obterColunasParceiros();
        const colunaImagem = obterColunaImagem(colunasParceiros);
        const colunaNome = colunasParceiros.has('nome_comercial')
            ? 'nome_comercial'
            : 'nome';
        const colunaTipoEmpresa = colunasParceiros.has('tipo_empresa')
            ? 'tipo_empresa'
            : 'tipo';
        const colunaMunicipio = colunasParceiros.has('municipio')
            ? 'municipio'
            : 'cidade';
        const colunaEstado = colunasParceiros.has('ativo')
            ? 'ativo'
            : colunasParceiros.has('estado_aprovacao')
                ? "CASE WHEN estado_aprovacao = 'aprovado' THEN 1 ELSE 0 END"
                : '1';
        const colunaCriadoEm = ['criado_em', 'data_cadastro', 'created_at']
            .find((coluna) => colunasParceiros.has(coluna));
        const colunaAtualizadoEm = ['atualizado_em', 'data_atualizacao', 'updated_at']
            .find((coluna) => colunasParceiros.has(coluna));
        const colunaPesquisaNomeEmpresa = colunasParceiros.has('nome_empresa')
            ? 'nome_empresa'
            : colunaNome;
        const colunaPesquisaNif = colunasParceiros.has('nif') ? 'nif' : null;

        let sql = `
            SELECT
                id,
                ${selecionarColuna(colunasParceiros, ['usuario_id'], 'usuario_id')},
                ${colunaNome} AS nome_comercial,
                ${selecionarColuna(colunasParceiros, ['nome_empresa'], 'nome_empresa')},
                ${selecionarColuna(colunasParceiros, ['nif'], 'nif')},
                ${colunaTipoEmpresa} AS tipo_empresa,
                ${selecionarColuna(colunasParceiros, ['telefone'], 'telefone')},
                ${selecionarColuna(colunasParceiros, ['email'], 'email')},
                ${selecionarColuna(colunasParceiros, ['descricao'], 'descricao')},
                ${selecionarColuna(colunasParceiros, ['endereco'], 'endereco')},
                ${colunaMunicipio} AS municipio,
                ${selecionarColuna(colunasParceiros, ['provincia'], 'provincia')},
                ${selecionarColuna(colunasParceiros, ['latitude'], 'latitude')},
                ${selecionarColuna(colunasParceiros, ['longitude'], 'longitude')},
                ${colunaImagem} AS logo_url,
                ${selecionarColuna(colunasParceiros, ['logo_public_id'], 'logo_public_id')},
                ${colunaEstado} AS ativo,
                ${colunaEstado === 'ativo' ? "'ativo'" : colunasParceiros.has('estado_aprovacao') ? 'estado_aprovacao' : "'ativo'"} AS estado_aprovacao,
                ${colunaCriadoEm || 'NULL'} AS criado_em,
                ${colunaAtualizadoEm || 'NULL'} AS atualizado_em
            FROM parceiros
            WHERE 1 = 1
        `;

        const valores = [];

        if (tipo_empresa) {
            sql += ` AND ${colunaTipoEmpresa} = ?`;
            valores.push(tipo_empresa);
        }

        if (municipio) {
            sql += ` AND ${colunaMunicipio} = ?`;
            valores.push(municipio);
        }

        if (pesquisa) {
            const camposPesquisa = [...new Set([colunaNome, colunaPesquisaNomeEmpresa, colunaPesquisaNif].filter(Boolean))];
            sql += ` AND (${camposPesquisa.map((campo) => `${campo} LIKE ?`).join(' OR ')})`;
            const termo = `%${pesquisa}%`;
            valores.push(...camposPesquisa.map(() => termo));
        }

        if (ativo !== undefined) {
            if (!['0', '1'].includes(String(ativo))) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'O parâmetro ativo deve ser 0 ou 1.'
                });
            }

            if (colunasParceiros.has('ativo')) {
                sql += ` AND ativo = ?`;
                valores.push(Number(ativo));
            } else if (colunasParceiros.has('estado_aprovacao')) {
                sql += Number(ativo) === 1
                    ? ` AND estado_aprovacao = 'aprovado'`
                    : ` AND estado_aprovacao <> 'aprovado'`;
            }
        }

        sql += ` ORDER BY ${colunaCriadoEm || 'id'} DESC`;

        const [parceiros] = await db.execute(sql, valores);

        return res.status(200).json({
            sucesso: true,
            total: parceiros.length,
            parceiros
        });

    } catch (error) {
        console.error('Erro ao listar parceiros:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar parceiros.'
        });
    }
};


// ============================================
// CONSULTAR PARCEIRO POR ID
// ============================================

exports.buscarParceiroPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const [parceiros] = await db.execute(
            `SELECT *
             FROM parceiros
             WHERE id = ?`,
            [id]
        );

        if (parceiros.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Parceiro não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            parceiro: parceiros[0]
        });

    } catch (error) {
        console.error('Erro ao consultar parceiro:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar parceiro.'
        });
    }
};


// ============================================
// ATUALIZAR PARCEIRO
// ============================================

exports.atualizarParceiro = async (req, res) => {
    try {
        const { id } = req.params;
        const colunasParceiros = await obterColunasParceiros();
        const colunaImagem = obterColunaImagem(colunasParceiros);

        const camposPermitidos = {
            nome_comercial: ['nome_comercial', 'nome'],
            nome_empresa: ['nome_empresa'],
            nif: ['nif'],
            tipo_empresa: ['tipo_empresa', 'tipo'],
            telefone: ['telefone'],
            email: ['email'],
            descricao: ['descricao'],
            endereco: ['endereco'],
            municipio: ['municipio', 'cidade'],
            provincia: ['provincia'],
            latitude: ['latitude'],
            longitude: ['longitude'],
            logo_url: [colunaImagem],
            logo_public_id: ['logo_public_id']
        };

        const campos = [];
        const valores = [];

        for (const [campo, candidatas] of Object.entries(camposPermitidos)) {
            const coluna = candidatas.find((candidata) => colunasParceiros.has(candidata));
            if (req.body[campo] !== undefined && coluna) {
                campos.push(`${coluna} = ?`);
                valores.push(req.body[campo]);
            }
        }

        if (req.file) {
            campos.push(`${colunaImagem} = ?`);
            valores.push(req.file.path);
            if (colunasParceiros.has('logo_public_id')) {
                campos.push('logo_public_id = ?');
                valores.push(req.file.filename);
            }
        }

        if (campos.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nenhum campo válido enviado para atualização.'
            });
        }

        const [existente] = await db.execute(
            `SELECT id
             FROM parceiros
             WHERE id = ?`,
            [id]
        );

        if (existente.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Parceiro não encontrado.'
            });
        }

        valores.push(id);

        const sql = `
            UPDATE parceiros
            SET ${campos.join(', ')}
            WHERE id = ?
        `;

        await db.execute(sql, valores);

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Dados do parceiro atualizados com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao atualizar parceiro:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar parceiro.'
        });
    }
};


// ============================================
// ATIVAR / DESATIVAR PARCEIRO
// ============================================

exports.alterarEstadoParceiro = async (req, res) => {
    try {
        const { id } = req.params;
        const { ativo } = req.body;

        if (![0, 1, false, true].includes(ativo)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O estado ativo deve ser 0 ou 1.'
            });
        }

        const colunasParceiros = await obterColunasParceiros();
        const usaEstadoAprovacao = !colunasParceiros.has('ativo') &&
            colunasParceiros.has('estado_aprovacao');
        const [resultado] = await db.execute(
            `UPDATE parceiros
             SET ${usaEstadoAprovacao ? 'estado_aprovacao' : 'ativo'} = ?
             WHERE id = ?`,
            [usaEstadoAprovacao
                ? Number(ativo) === 1 ? 'aprovado' : 'suspenso'
                : Number(ativo), id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Parceiro não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: Number(ativo) === 1
                ? 'Parceiro ativado com sucesso.'
                : 'Parceiro desativado com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao alterar estado:', error);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao alterar estado do parceiro.'
        });
    }
};


// ============================================
// ELIMINAR PARCEIRO
// ============================================

exports.eliminarParceiro = async (req, res) => {
    try {
        const { id } = req.params;

        const [resultado] = await db.execute(
            `DELETE FROM parceiros
             WHERE id = ?`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Parceiro não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Parceiro eliminado com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao eliminar parceiro:', error);

        if (error.code === 'ER_ROW_IS_REFERENCED' || error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Não é possível remover este estabelecimento enquanto existirem produtos ou pedidos associados.'
            });
        }

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao eliminar parceiro.'
        });
    }
};
