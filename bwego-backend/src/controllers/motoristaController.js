
const mysql = require('../config/db');

// =====================================================
// CONSTANTES
// =====================================================

const ESTADOS_APROVACAO = [
    'pendente',
    'aprovado',
    'rejeitado',
    'suspenso'
];

const DISPONIBILIDADES = [
    'disponivel',
    'ocupado',
    'offline'
];

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

const validarId = (id) => {
    const numero = Number(id);

    return Number.isSafeInteger(numero) && numero > 0
        ? numero
        : null;
};

const validarCoordenadas = (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        return null;
    }

    return { lat, lng };
};

const erroDuplicado = (erro) => {
    return erro.code === 'ER_DUP_ENTRY';
};

const verificarAdministrador = (req, res) => {
    if (req.user?.tipo !== 'admin' && req.user?.tipo !== 'gestor') {
        res.status(403).json({
            sucesso: false,
            mensagem: 'Não tens autorização para realizar esta operação.'
        });

        return false;
    }

    return true;
};

// =====================================================
// CADASTRAR MOTORISTA
// =====================================================

exports.cadastrar = async (req, res) => {
    try {
        const usuarioId = validarId(req.user?.id);

        if (!usuarioId) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Utilizador não autenticado.'
            });
        }

        const {
            numero_carta_conducao,
            categoria_carta,
            validade_carta,
            numero_bi,
            data_nascimento,
            marca_veiculo,
            modelo_veiculo,
            matricula,
            cor_veiculo,
            ano_veiculo,
            capacidade_passageiros
        } = req.body;

        const camposObrigatorios = {
            numero_carta_conducao,
            categoria_carta,
            validade_carta,
            numero_bi,
            data_nascimento,
            marca_veiculo,
            modelo_veiculo,
            matricula
        };

        for (const [campo, valor] of Object.entries(camposObrigatorios)) {
            if (
                typeof valor !== 'string' ||
                !valor.trim()
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: `O campo ${campo} é obrigatório.`
                });
            }
        }

        const camposData = [
            validade_carta,
            data_nascimento
        ];

        for (const data of camposData) {
            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
                Number.isNaN(Date.parse(`${data}T00:00:00Z`)) ||
                new Date(`${data}T00:00:00Z`).toISOString().slice(0, 10) !== data
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Uma das datas informadas é inválida. Utilize AAAA-MM-DD.'
                });
            }
        }

        const capacidade = capacidade_passageiros === undefined
            ? 4
            : Number(capacidade_passageiros);

        if (
            !Number.isInteger(capacidade) ||
            capacidade < 1 ||
            capacidade > 100
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Capacidade de passageiros inválida.'
            });
        }

        let ano = null;

        if (ano_veiculo !== undefined && ano_veiculo !== null && ano_veiculo !== '') {
            ano = Number(ano_veiculo);

            if (
                !Number.isInteger(ano) ||
                ano < 1901 ||
                ano > 2155
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Ano do veículo inválido.'
                });
            }
        }

        const [usuario] = await mysql.execute(
            `SELECT id
             FROM usuarios
             WHERE id = ? AND ativo = TRUE
             LIMIT 1`,
            [usuarioId]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Utilizador não encontrado ou desativado.'
            });
        }

        const [motoristaExistente] = await mysql.execute(
            `SELECT id
             FROM motoristas
             WHERE usuario_id = ?
             LIMIT 1`,
            [usuarioId]
        );

        if (motoristaExistente.length > 0) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Já existe um cadastro de motorista associado a esta conta.'
            });
        }

        const [resultado] = await mysql.execute(
            `INSERT INTO motoristas (
                usuario_id,
                numero_carta_conducao,
                categoria_carta,
                validade_carta,
                numero_bi,
                data_nascimento,
                marca_veiculo,
                modelo_veiculo,
                matricula,
                cor_veiculo,
                ano_veiculo,
                capacidade_passageiros,
                estado_aprovacao,
                disponibilidade
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', 'offline')`,
            [
                usuarioId,
                numero_carta_conducao.trim(),
                categoria_carta.trim(),
                validade_carta,
                numero_bi.trim(),
                data_nascimento,
                marca_veiculo.trim(),
                modelo_veiculo.trim(),
                matricula.trim().toUpperCase(),
                cor_veiculo ? cor_veiculo.trim() : null,
                ano,
                capacidade
            ]
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Cadastro de motorista enviado para aprovação.',
            motorista: {
                id: resultado.insertId,
                usuario_id: usuarioId,
                estado_aprovacao: 'pendente',
                disponibilidade: 'offline'
            }
        });

    } catch (erro) {
        console.error('Erro ao cadastrar motorista:', erro);

        if (erroDuplicado(erro)) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'BI, carta de condução ou matrícula já registados.'
            });
        }

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao cadastrar motorista.'
        });
    }
};

// =====================================================
// CONSULTAR PERFIL DO MOTORISTA
// =====================================================

exports.obterPerfil = async (req, res) => {
    try {
        const usuarioId = validarId(req.user?.id);

        if (!usuarioId) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Utilizador não autenticado.'
            });
        }

        const [motoristas] = await mysql.execute(
            `SELECT
                m.*,
                u.nome,
                u.email,
                u.telefone,
                u.foto_url
             FROM motoristas m
             INNER JOIN usuarios u ON u.id = m.usuario_id
             WHERE m.usuario_id = ?
             LIMIT 1`,
            [usuarioId]
        );

        if (motoristas.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Perfil de motorista não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            motorista: motoristas[0]
        });

    } catch (erro) {
        console.error('Erro ao consultar motorista:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar perfil do motorista.'
        });
    }
};

// =====================================================
// LISTAR TODOS OS MOTORISTAS
// ADMINISTRADOR
// =====================================================

exports.listar = async (req, res) => {
    try {
        if (!verificarAdministrador(req, res)) {
            return;
        }

        const {
            busca,
            estado_aprovacao,
            disponibilidade
        } = req.query;

        let sql = `
            SELECT
                m.*,
                u.nome,
                u.email,
                u.telefone,
                u.foto_url
            FROM motoristas m
            INNER JOIN usuarios u ON u.id = m.usuario_id
            WHERE 1 = 1
        `;

        const parametros = [];

        if (busca && String(busca).trim()) {
            const termo = `%${String(busca).trim()}%`;

            sql += `
                AND (
                    u.nome LIKE ?
                    OR u.telefone LIKE ?
                    OR m.numero_bi LIKE ?
                    OR m.matricula LIKE ?
                    OR m.numero_carta_conducao LIKE ?
                )
            `;

            parametros.push(
                termo,
                termo,
                termo,
                termo,
                termo
            );
        }

        if (estado_aprovacao) {
            if (!ESTADOS_APROVACAO.includes(estado_aprovacao)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Estado de aprovação inválido.',
                    estados_permitidos: ESTADOS_APROVACAO
                });
            }

            sql += ' AND m.estado_aprovacao = ?';
            parametros.push(estado_aprovacao);
        }

        if (disponibilidade) {
            if (!DISPONIBILIDADES.includes(disponibilidade)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Disponibilidade inválida.',
                    disponibilidades_permitidas: DISPONIBILIDADES
                });
            }

            sql += ' AND m.disponibilidade = ?';
            parametros.push(disponibilidade);
        }

        sql += ' ORDER BY m.data_cadastro DESC';

        const [motoristas] = await mysql.execute(
            sql,
            parametros
        );

        return res.status(200).json({
            sucesso: true,
            total: motoristas.length,
            motoristas
        });

    } catch (erro) {
        console.error('Erro ao listar motoristas:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao listar motoristas.'
        });
    }
};

// =====================================================
// BUSCAR MOTORISTA POR ID
// ADMINISTRADOR
// =====================================================

exports.buscarPorId = async (req, res) => {
    try {
        if (!verificarAdministrador(req, res)) {
            return;
        }

        const motoristaId = validarId(req.params.id);

        if (!motoristaId) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID do motorista inválido.'
            });
        }

        const [motoristas] = await mysql.execute(
            `SELECT
                m.*,
                u.nome,
                u.email,
                u.telefone,
                u.foto_url
             FROM motoristas m
             INNER JOIN usuarios u ON u.id = m.usuario_id
             WHERE m.id = ?
             LIMIT 1`,
            [motoristaId]
        );

        if (motoristas.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Motorista não encontrado.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            motorista: motoristas[0]
        });

    } catch (erro) {
        console.error('Erro ao buscar motorista:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar motorista.'
        });
    }
};

// =====================================================
// ATUALIZAR PERFIL DO MOTORISTA
// =====================================================

exports.atualizarPerfil = async (req, res) => {
    try {
        const usuarioId = validarId(req.user?.id);

        if (!usuarioId) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Utilizador não autenticado.'
            });
        }

        const camposPermitidos = [
            'numero_carta_conducao',
            'categoria_carta',
            'validade_carta',
            'numero_bi',
            'data_nascimento',
            'marca_veiculo',
            'modelo_veiculo',
            'matricula',
            'cor_veiculo',
            'ano_veiculo',
            'capacidade_passageiros'
        ];

        const atualizacoes = [];
        const valores = [];

        for (const campo of camposPermitidos) {
            if (req.body[campo] !== undefined) {
                atualizacoes.push(`${campo} = ?`);

                let valor = req.body[campo];

                if (typeof valor === 'string') {
                    valor = valor.trim();
                }

                if (campo === 'matricula' && valor) {
                    valor = valor.toUpperCase();
                }

                if (
                    campo === 'capacidade_passageiros' ||
                    campo === 'ano_veiculo'
                ) {
                    if (valor === '' || valor === null) {
                        valor = campo === 'ano_veiculo' ? null : 4;
                    } else {
                        valor = Number(valor);
                    }

                    if (
                        valor !== null &&
                        (
                            !Number.isInteger(valor) ||
                            (campo === 'capacidade_passageiros' && (valor < 1 || valor > 100)) ||
                            (campo === 'ano_veiculo' && (valor < 1901 || valor > 2155))
                        )
                    ) {
                        return res.status(400).json({
                            sucesso: false,
                            mensagem: `Valor inválido para ${campo}.`
                        });
                    }
                }

                if (
                    ['validade_carta', 'data_nascimento'].includes(campo) &&
                    (
                        typeof valor !== 'string' ||
                        !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
                        Number.isNaN(Date.parse(`${valor}T00:00:00Z`)) ||
                        new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) !== valor
                    )
                ) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: `Data inválida para ${campo}.`
                    });
                }

                atualizacoes.push;
                valores.push(valor);
            }
        }

        if (atualizacoes.length === 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nenhum campo válido foi enviado para atualização.'
            });
        }

        const [existente] = await mysql.execute(
            `SELECT id, estado_aprovacao
             FROM motoristas
             WHERE usuario_id = ?
             LIMIT 1`,
            [usuarioId]
        );

        if (existente.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Perfil de motorista não encontrado.'
            });
        }

        // Alterações de documentos e veículo exigem nova aprovação.
        atualizacoes.push("estado_aprovacao = 'pendente'");
        atualizacoes.push("disponibilidade = 'offline'");

        valores.push(usuarioId);

        await mysql.execute(
            `UPDATE motoristas
             SET ${atualizacoes.join(', ')}
             WHERE usuario_id = ?`,
            valores
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Dados atualizados. O cadastro voltou para aprovação.',
            estado_aprovacao: 'pendente',
            disponibilidade: 'offline'
        });

    } catch (erro) {
        console.error('Erro ao atualizar motorista:', erro);

        if (erroDuplicado(erro)) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'BI, carta de condução ou matrícula já pertencem a outro motorista.'
            });
        }

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar dados do motorista.'
        });
    }
};

// =====================================================
// ATUALIZAR DISPONIBILIDADE
// =====================================================

exports.atualizarDisponibilidade = async (req, res) => {
    try {
        const usuarioId = validarId(req.user?.id);
        const { disponibilidade } = req.body;

        if (!usuarioId) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Utilizador não autenticado.'
            });
        }

        if (!DISPONIBILIDADES.includes(disponibilidade)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Disponibilidade inválida.',
                disponibilidades_permitidas: DISPONIBILIDADES
            });
        }

        const [motoristas] = await mysql.execute(
            `SELECT id, estado_aprovacao
             FROM motoristas
             WHERE usuario_id = ?
             LIMIT 1`,
            [usuarioId]
        );

        if (motoristas.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Motorista não encontrado.'
            });
        }

        if (
            motoristas[0].estado_aprovacao !== 'aprovado' &&
            disponibilidade !== 'offline'
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas motoristas aprovados podem ficar disponíveis ou ocupados.'
            });
        }

        await mysql.execute(
            `UPDATE motoristas
             SET disponibilidade = ?
             WHERE usuario_id = ?`,
            [disponibilidade, usuarioId]
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Disponibilidade atualizada.',
            disponibilidade
        });

    } catch (erro) {
        console.error('Erro ao atualizar disponibilidade:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar disponibilidade.'
        });
    }
};

// =====================================================
// LISTAR MOTORISTAS DISPONÍVEIS PERTO DO CLIENTE
// =====================================================

exports.listarProximos = async (req, res) => {
    const coordenadas = validarCoordenadas(
        req.query.latitude,
        req.query.longitude
    );
    const raioKm = req.query.raio_km === undefined
        ? 5
        : Number(req.query.raio_km);

    if (!coordenadas) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Coordenadas GPS inválidas.'
        });
    }

    if (!Number.isFinite(raioKm) || raioKm < 1 || raioKm > 10) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O raio de pesquisa deve estar entre 1 e 10 km.'
        });
    }

    const deltaLatitude = raioKm / 110.574;
    const cosLatitude = Math.max(
        Math.abs(Math.cos(coordenadas.lat * Math.PI / 180)),
        0.01
    );
    const deltaLongitude = raioKm / (111.32 * cosLatitude);
    const minLatitude = Math.max(-90, coordenadas.lat - deltaLatitude);
    const maxLatitude = Math.min(90, coordenadas.lat + deltaLatitude);
    const minLongitude = Math.max(-180, coordenadas.lng - deltaLongitude);
    const maxLongitude = Math.min(180, coordenadas.lng + deltaLongitude);

    try {
        const [motoristas] = await mysql.execute(
            `SELECT
                proximos.id,
                proximos.latitude,
                proximos.longitude,
                proximos.nome,
                proximos.foto_url,
                proximos.avaliacao_media,
                proximos.distancia_km
             FROM (
                SELECT
                    m.id,
                    m.latitude,
                    m.longitude,
                    u.nome,
                    u.foto_url,
                    m.avaliacao_media,
                    6371 * ACOS(LEAST(1, GREATEST(-1,
                        SIN(RADIANS(?)) * SIN(RADIANS(m.latitude)) +
                        COS(RADIANS(?)) * COS(RADIANS(m.latitude)) *
                        COS(RADIANS(m.longitude) - RADIANS(?))
                    ))) AS distancia_km
                FROM motoristas m
                INNER JOIN usuarios u ON u.id = m.usuario_id
                WHERE m.estado_aprovacao = 'aprovado'
                  AND m.disponibilidade = 'disponivel'
                  AND m.latitude IS NOT NULL
                  AND m.longitude IS NOT NULL
                  AND m.localizacao_atualizada_em >= DATE_SUB(
                      CURRENT_TIMESTAMP,
                      INTERVAL 90 SECOND
                  )
                  AND u.ativo = TRUE
                  AND m.latitude BETWEEN ? AND ?
                  AND m.longitude BETWEEN ? AND ?
             ) AS proximos
             WHERE proximos.distancia_km <= ?
             ORDER BY proximos.distancia_km ASC
             LIMIT 25`,
            [
                coordenadas.lat,
                coordenadas.lat,
                coordenadas.lng,
                minLatitude,
                maxLatitude,
                minLongitude,
                maxLongitude,
                raioKm
            ]
        );

        return res.status(200).json({
            sucesso: true,
            raio_km: raioKm,
            total: motoristas.length,
            motoristas
        });
    } catch (erro) {
        console.error('Erro ao listar motoristas próximos:', erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Não foi possível consultar os motoristas próximos.'
        });
    }
};

// =====================================================
// ATUALIZAR LOCALIZAÇÃO GPS
// =====================================================

exports.atualizarLocalizacao = async (req, res) => {
    try {
        const usuarioId = validarId(req.user?.id);

        if (!usuarioId) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Utilizador não autenticado.'
            });
        }

        const coordenadas = validarCoordenadas(
            req.body.latitude,
            req.body.longitude
        );

        if (!coordenadas) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Coordenadas GPS inválidas.'
            });
        }

        const [motoristas] = await mysql.execute(
            `SELECT id, estado_aprovacao
             FROM motoristas
             WHERE usuario_id = ?
             LIMIT 1`,
            [usuarioId]
        );

        if (motoristas.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Motorista não encontrado.'
            });
        }

        if (motoristas[0].estado_aprovacao !== 'aprovado') {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas motoristas aprovados podem atualizar a localização.'
            });
        }

        await mysql.execute(
            `UPDATE motoristas
             SET latitude = ?,
                 longitude = ?,
                 localizacao_atualizada_em = CURRENT_TIMESTAMP
             WHERE usuario_id = ?`,
            [
                coordenadas.lat,
                coordenadas.lng,
                usuarioId
            ]
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Localização atualizada.',
            latitude: coordenadas.lat,
            longitude: coordenadas.lng
        });

    } catch (erro) {
        console.error('Erro ao atualizar localização:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar localização.'
        });
    }
};

// =====================================================
// APROVAR, REJEITAR OU SUSPENDER MOTORISTA
// ADMINISTRADOR
// =====================================================

exports.atualizarEstadoAprovacao = async (req, res) => {
    const conexao = await mysql.getConnection();

    try {
        if (!verificarAdministrador(req, res)) {
            return;
        }

        const motoristaId = validarId(req.params.id);
        const { estado_aprovacao } = req.body;

        if (
            req.user?.tipo === 'gestor' &&
            !['aprovado', 'rejeitado'].includes(estado_aprovacao)
        ) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Gestores só podem aprovar ou reprovar motoristas.'
            });
        }

        if (!motoristaId) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID do motorista inválido.'
            });
        }

        if (!ESTADOS_APROVACAO.includes(estado_aprovacao)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Estado de aprovação inválido.',
                estados_permitidos: ESTADOS_APROVACAO
            });
        }

        const [motoristas] = await conexao.execute(
            `SELECT id, estado_aprovacao
             FROM motoristas
             WHERE id = ?
             LIMIT 1`,
            [motoristaId]
        );

        if (motoristas.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Motorista não encontrado.'
            });
        }

        await conexao.beginTransaction();

        const disponibilidade = estado_aprovacao === 'aprovado'
            ? 'offline'
            : 'offline';

        await conexao.execute(
            `UPDATE motoristas
             SET estado_aprovacao = ?, disponibilidade = ?
             WHERE id = ?`,
            [
                estado_aprovacao,
                disponibilidade,
                motoristaId
            ]
        );

        await conexao.commit();

        return res.status(200).json({
            sucesso: true,
            mensagem: `Estado do motorista atualizado para ${estado_aprovacao}.`,
            motorista: {
                id: motoristaId,
                estado_aprovacao,
                disponibilidade
            }
        });

    } catch (erro) {
        await conexao.rollback();

        console.error('Erro ao atualizar aprovação:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar aprovação do motorista.'
        });

    } finally {
        conexao.release();
    }
};

// =====================================================
// LISTAR MOTORISTAS DISPONÍVEIS
// ADMINISTRADOR
// =====================================================

exports.listarDisponiveis = async (req, res) => {
    try {
        if (!verificarAdministrador(req, res)) {
            return;
        }

        const [motoristas] = await mysql.execute(
            `SELECT
                m.id,
                m.usuario_id,
                m.marca_veiculo,
                m.modelo_veiculo,
                m.matricula,
                m.cor_veiculo,
                m.avaliacao_media,
                m.total_viagens,
                m.latitude,
                m.longitude,
                u.nome,
                u.telefone,
                u.foto_url
             FROM motoristas m
             INNER JOIN usuarios u ON u.id = m.usuario_id
             WHERE
                m.estado_aprovacao = 'aprovado'
                AND m.disponibilidade = 'disponivel'
                AND u.ativo = TRUE
             ORDER BY m.avaliacao_media DESC`
        );

        return res.status(200).json({
            sucesso: true,
            total: motoristas.length,
            motoristas
        });

    } catch (erro) {
        console.error('Erro ao listar motoristas disponíveis:', erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao consultar motoristas disponíveis.'
        });
    }
};
