
const mysql = require('../config/db');

const CACHE_GEOCODIFICACAO_TTL = 24 * 60 * 60 * 1000;
const CACHE_GEOCODIFICACAO_MAX = 5000;
const cacheGeocodificacao = new Map();
const pedidosGeocodificacao = new Map();
let filaGeocodificacao = Promise.resolve();
let ultimaConsultaGeocodificacao = 0;

// =====================================================
// ESTADOS E CONFIGURAÇÕES
// =====================================================

const ESTADOS_TERMINAIS = ['concluida', 'cancelada', 'rejeitada'];

const TRANSICOES_MOTORISTA = {
    aceite: 'motorista_a_caminho',
    motorista_a_caminho: 'motorista_chegou',
    motorista_chegou: 'em_andamento',
    em_andamento: 'concluida'
};

const METODOS_PAGAMENTO = [
    'dinheiro',
    'carteira',
    'multicaixa',
    'transferencia'
];

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function respostaErro(res, erro, mensagem = 'Erro interno do servidor.') {
    console.error(mensagem, erro);

    return res.status(500).json({
        sucesso: false,
        mensagem
    });
}

function validarCoordenadas(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
}

function removerDuplicados(partes) {
    const vistos = new Set();

    return partes.filter((parte) => {
        if (!parte) return false;
        const chave = parte.trim().toLocaleLowerCase('pt');
        if (!chave || vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
    });
}

function normalizarEnderecoGeografico(resultado) {
    const endereco = resultado.address || {};
    const localidade =
        endereco.neighbourhood ||
        endereco.residential ||
        endereco.suburb ||
        endereco.quarter ||
        endereco.village ||
        endereco.town ||
        endereco.city_district ||
        endereco.city ||
        endereco.hamlet ||
        resultado.name ||
        '';
    const municipio =
        endereco.municipality ||
        endereco.county ||
        endereco.city_district ||
        '';
    const provincia =
        endereco.state ||
        endereco.state_district ||
        endereco.province ||
        endereco.region ||
        '';
    const pais = endereco.country || '';
    const logradouro = [
        endereco.road,
        endereco.house_number
    ].filter(Boolean).join(', ');
    const partes = removerDuplicados([
        logradouro,
        localidade,
        municipio,
        provincia,
        pais
    ]);

    return {
        localidade,
        municipio,
        provincia,
        pais,
        endereco: partes.join(', ')
    };
}

async function consultarGeocodificacao(latitude, longitude) {
    const chave = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const emCache = cacheGeocodificacao.get(chave);

    if (emCache && Date.now() - emCache.criadoEm < CACHE_GEOCODIFICACAO_TTL) {
        return emCache.valor;
    }

    if (pedidosGeocodificacao.has(chave)) {
        return pedidosGeocodificacao.get(chave);
    }

    const pedido = filaGeocodificacao.then(async () => {
        const intervalo = 1100 - (Date.now() - ultimaConsultaGeocodificacao);
        if (intervalo > 0) {
            await new Promise((resolver) => setTimeout(resolver, intervalo));
        }

        ultimaConsultaGeocodificacao = Date.now();
        const parametros = new URLSearchParams({
            format: 'jsonv2',
            lat: String(latitude),
            lon: String(longitude),
            addressdetails: '1',
            zoom: '18',
            'accept-language': 'pt'
        });

        if (process.env.NOMINATIM_EMAIL) {
            parametros.set('email', process.env.NOMINATIM_EMAIL);
        }

        const resposta = await fetch(
            `https://nominatim.openstreetmap.org/reverse?${parametros}`,
            {
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'BweGo/1.0 (location address lookup)'
                },
                signal: AbortSignal.timeout(10000)
            }
        );

        if (!resposta.ok) {
            throw new Error(`Geocodificação respondeu com HTTP ${resposta.status}.`);
        }

        const resultado = await resposta.json();
        if (!resultado.address) {
            return null;
        }

        const valor = normalizarEnderecoGeografico(resultado);
        if (cacheGeocodificacao.size >= CACHE_GEOCODIFICACAO_MAX) {
            cacheGeocodificacao.delete(cacheGeocodificacao.keys().next().value);
        }
        cacheGeocodificacao.set(chave, { criadoEm: Date.now(), valor });
        return valor;
    });

    pedidosGeocodificacao.set(chave, pedido);
    filaGeocodificacao = pedido.catch(() => {});

    try {
        return await pedido;
    } finally {
        pedidosGeocodificacao.delete(chave);
    }
}

async function obterMotorista(connection, usuarioId) {
    const [motoristas] = await connection.execute(
        `SELECT id, estado_aprovacao, disponibilidade
         FROM motoristas
         WHERE usuario_id = ?
         LIMIT 1`,
        [usuarioId]
    );

    return motoristas[0] || null;
}

async function obterViagem(connection, viagemId) {
    const [viagens] = await connection.execute(
        `SELECT *
         FROM viagens
         WHERE id = ?
         LIMIT 1`,
        [viagemId]
    );

    return viagens[0] || null;
}

exports.geocodificarLocalizacao = async (req, res) => {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    if (!validarCoordenadas(latitude, longitude)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'As coordenadas informadas são inválidas.'
        });
    }

    try {
        const localizacao = await consultarGeocodificacao(latitude, longitude);
        if (!localizacao) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Não foi encontrado um endereço para estas coordenadas.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            localizacao
        });
    } catch (erro) {
        console.error('Erro ao obter endereço das coordenadas:', erro);
        return res.status(502).json({
            sucesso: false,
            mensagem: 'Não foi possível identificar o endereço neste momento.'
        });
    }
};

// =====================================================
// 1. CRIAR SOLICITAÇÃO DE VIAGEM
// =====================================================

exports.criar = async (req, res) => {
    const {
        origem_nome,
        origem_endereco,
        origem_latitude,
        origem_longitude,

        destino_nome,
        destino_endereco,
        destino_latitude,
        destino_longitude,

        distancia_km,
        duracao_estimada_minutos,

        tipo_viagem = 'imediata',
        data_agendada = null,
        numero_passageiros = 1,
        categoria = 'economico',

        preco_estimado = 0,
        metodo_pagamento
    } = req.body;

    const usuarioId = req.user.id;

    try {
        // Validar campos obrigatórios
        if (
            !origem_nome ||
            !destino_nome ||
            origem_latitude === undefined ||
            origem_longitude === undefined ||
            destino_latitude === undefined ||
            destino_longitude === undefined
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Preencha os locais de partida e destino.'
            });
        }

        // Validar coordenadas
        if (
            !validarCoordenadas(origem_latitude, origem_longitude) ||
            !validarCoordenadas(destino_latitude, destino_longitude)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'As coordenadas informadas são inválidas.'
            });
        }

        // Validar tipo de viagem
        if (!['imediata', 'agendada'].includes(tipo_viagem)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Tipo de viagem inválido.'
            });
        }

        if (!['economico', 'conforto', 'premium', 'moto'].includes(categoria)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Categoria de viagem inválida.'
            });
        }

        // Validar data agendada
        if (tipo_viagem === 'agendada') {
            if (!data_agendada || isNaN(Date.parse(data_agendada))) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Informe uma data válida para a viagem.'
                });
            }

            if (new Date(data_agendada).getTime() <= Date.now()) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'A data agendada deve ser futura.'
                });
            }
        }

        // Validar passageiros
        const passageiros = Number(numero_passageiros);

        if (
            !Number.isInteger(passageiros) ||
            passageiros < 1 ||
            passageiros > 8
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Número de passageiros inválido.'
            });
        }

        // Validar preço estimado
        const preco = Number(preco_estimado);

        if (!Number.isFinite(preco) || preco < 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Preço estimado inválido.'
            });
        }

        // Validar método de pagamento
        if (
            metodo_pagamento &&
            !METODOS_PAGAMENTO.includes(metodo_pagamento)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Método de pagamento inválido.'
            });
        }

        const distancia = distancia_km === undefined
            ? 0
            : Number(distancia_km);

        const duracao = duracao_estimada_minutos === undefined ||
            duracao_estimada_minutos === null
            ? null
            : Number(duracao_estimada_minutos);

        if (!Number.isFinite(distancia) || distancia < 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Distância inválida.'
            });
        }

        if (
            duracao !== null &&
            (!Number.isInteger(duracao) || duracao < 0)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Duração estimada inválida.'
            });
        }

        const estado = tipo_viagem === 'imediata'
            ? 'procurando_motorista'
            : 'pendente';

        const [resultado] = await mysql.execute(
            `INSERT INTO viagens (
                usuario_id,
                origem_nome,
                origem_endereco,
                origem_latitude,
                origem_longitude,
                destino_nome,
                destino_endereco,
                destino_latitude,
                destino_longitude,
                distancia_km,
                duracao_estimada_minutos,
                tipo_viagem,
                categoria,
                data_agendada,
                numero_passageiros,
                preco_estimado,
                metodo_pagamento,
                estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                usuarioId,
                origem_nome.trim(),
                origem_endereco || null,
                origem_latitude,
                origem_longitude,
                destino_nome.trim(),
                destino_endereco || null,
                destino_latitude,
                destino_longitude,
                distancia,
                duracao,
                tipo_viagem,
                categoria,
                tipo_viagem === 'agendada' ? data_agendada : null,
                passageiros,
                preco,
                metodo_pagamento || null,
                estado
            ]
        );

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Viagem solicitada com sucesso.',
            viagem: {
                id: resultado.insertId,
                estado,
                tipo_viagem
            }
        });

    } catch (erro) {
        return respostaErro(res, erro, 'Erro ao solicitar viagem.');
    }
};

// =====================================================
// 2. LISTAR VIAGENS DO UTILIZADOR
// =====================================================

exports.listar = async (req, res) => {
    const usuarioId = req.user.id;

    try {
        const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
        const limite = Math.min(
            50,
            Math.max(1, Number.parseInt(req.query.limite, 10) || 10)
        );

        const offset = (pagina - 1) * limite;

        const [viagens] = await mysql.execute(
            `SELECT
                v.*,
                u.nome AS passageiro_nome,
                u.telefone AS passageiro_telefone,
                um.nome AS motorista_nome,
                um.telefone AS motorista_telefone,
                um.foto_url AS motorista_foto_url,
                m.matricula AS motorista_matricula,
                m.marca_veiculo,
                m.modelo_veiculo,
                m.cor_veiculo
             FROM viagens v
             INNER JOIN usuarios u
                ON u.id = v.usuario_id
             LEFT JOIN motoristas m
                ON m.id = v.motorista_id
             LEFT JOIN usuarios um
                ON um.id = m.usuario_id
             WHERE
                v.usuario_id = ?
                OR m.usuario_id = ?
             ORDER BY v.data_solicitacao DESC
             LIMIT ? OFFSET ?`,
            [usuarioId, usuarioId, limite, offset]
        );

        return res.status(200).json({
            sucesso: true,
            pagina,
            limite,
            total: viagens.length,
            viagens
        });

    } catch (erro) {
        return respostaErro(res, erro, 'Erro ao listar viagens.');
    }
};

exports.listarDisponiveis = async (req, res) => {
    const usuarioId = Number(req.user?.id);
    const raioKm = req.query.raio_km === undefined
        ? 10
        : Number(req.query.raio_km);

    if (!Number.isSafeInteger(usuarioId) || usuarioId < 1) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Utilizador não autenticado.'
        });
    }
    if (!Number.isFinite(raioKm) || raioKm < 1 || raioKm > 20) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O raio de pesquisa deve estar entre 1 e 20 km.'
        });
    }

    try {
        const [motoristas] = await mysql.execute(
            `SELECT id, estado_aprovacao, disponibilidade, latitude, longitude,
                    localizacao_atualizada_em,
                    (
                        localizacao_atualizada_em IS NOT NULL
                        AND localizacao_atualizada_em >= DATE_SUB(
                            CURRENT_TIMESTAMP,
                            INTERVAL 90 SECOND
                        )
                    ) AS localizacao_recente
             FROM motoristas
             WHERE usuario_id = ?
             LIMIT 1`,
            [usuarioId]
        );
        if (!motoristas.length || motoristas[0].estado_aprovacao !== 'aprovado') {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas motoristas aprovados podem consultar pedidos.'
            });
        }

        const motorista = motoristas[0];
        if (
            motorista.disponibilidade !== 'disponivel' ||
            motorista.latitude === null ||
            motorista.longitude === null ||
            !motorista.localizacao_recente
        ) {
            return res.status(200).json({ sucesso: true, pedidos: [] });
        }

        const latitude = Number(motorista.latitude);
        const longitude = Number(motorista.longitude);
        const deltaLatitude = raioKm / 110.574;
        const cosLatitude = Math.max(
            Math.abs(Math.cos(latitude * Math.PI / 180)),
            0.01
        );
        const deltaLongitude = raioKm / (111.32 * cosLatitude);
        const [pedidos] = await mysql.execute(
            `SELECT
                proximos.id,
                proximos.passageiro_nome,
                proximos.origem_nome,
                proximos.origem_endereco,
                proximos.origem_latitude,
                proximos.origem_longitude,
                proximos.destino_nome,
                proximos.destino_endereco,
                proximos.destino_latitude,
                proximos.destino_longitude,
                proximos.distancia_km,
                proximos.duracao_estimada_minutos,
                proximos.categoria,
                proximos.numero_passageiros,
                proximos.preco_estimado,
                proximos.metodo_pagamento,
                proximos.data_solicitacao,
                proximos.distancia_motorista_km
             FROM (
                SELECT
                    v.id,
                    u.nome AS passageiro_nome,
                    v.origem_nome,
                    v.origem_endereco,
                    v.origem_latitude,
                    v.origem_longitude,
                    v.destino_nome,
                    v.destino_endereco,
                    v.destino_latitude,
                    v.destino_longitude,
                    v.distancia_km,
                    v.duracao_estimada_minutos,
                    v.categoria,
                    v.numero_passageiros,
                    v.preco_estimado,
                    v.metodo_pagamento,
                    v.data_solicitacao,
                    6371 * ACOS(LEAST(1, GREATEST(-1,
                        SIN(RADIANS(?)) * SIN(RADIANS(v.origem_latitude)) +
                        COS(RADIANS(?)) * COS(RADIANS(v.origem_latitude)) *
                        COS(RADIANS(v.origem_longitude) - RADIANS(?))
                    ))) AS distancia_motorista_km
                FROM viagens v
                INNER JOIN usuarios u ON u.id = v.usuario_id
                WHERE v.motorista_id IS NULL
                  AND v.tipo_viagem = 'imediata'
                  AND v.estado = 'procurando_motorista'
                  AND u.ativo = TRUE
                  AND v.origem_latitude BETWEEN ? AND ?
                  AND v.origem_longitude BETWEEN ? AND ?
             ) AS proximos
             WHERE proximos.distancia_motorista_km <= ?
             ORDER BY proximos.distancia_motorista_km ASC,
                      proximos.data_solicitacao ASC
             LIMIT 25`,
            [
                latitude,
                latitude,
                longitude,
                Math.max(-90, latitude - deltaLatitude),
                Math.min(90, latitude + deltaLatitude),
                Math.max(-180, longitude - deltaLongitude),
                Math.min(180, longitude + deltaLongitude),
                raioKm
            ]
        );

        return res.status(200).json({ sucesso: true, pedidos });
    } catch (erro) {
        return respostaErro(res, erro, 'Erro ao consultar pedidos próximos.');
    }
};

exports.obterAtiva = async (req, res) => {
    const usuarioId = Number(req.user?.id);
    if (!Number.isSafeInteger(usuarioId) || usuarioId < 1) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Utilizador não autenticado.'
        });
    }

    try {
        const [viagens] = await mysql.execute(
            `SELECT
                v.*,
                u.nome AS passageiro_nome,
                u.telefone AS passageiro_telefone,
                u.foto_url AS passageiro_foto_url
             FROM viagens v
             INNER JOIN motoristas m ON m.id = v.motorista_id
             INNER JOIN usuarios u ON u.id = v.usuario_id
             WHERE m.usuario_id = ?
               AND v.estado IN (
                   'aceite',
                   'motorista_a_caminho',
                   'motorista_chegou',
                   'em_andamento'
               )
             ORDER BY v.data_aceite DESC, v.id DESC
             LIMIT 1`,
            [usuarioId]
        );
        return res.status(200).json({
            sucesso: true,
            viagem: viagens[0] || null
        });
    } catch (erro) {
        return respostaErro(res, erro, 'Erro ao consultar a viagem ativa.');
    }
};

// =====================================================
// 3. BUSCAR VIAGEM POR ID
// =====================================================

exports.buscarPorId = async (req, res) => {
    const { id } = req.params;
    const usuarioId = req.user.id;

    try {
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID de viagem inválido.'
            });
        }

        const [viagens] = await mysql.execute(
            `SELECT
                v.*,
                u.nome AS passageiro_nome,
                u.telefone AS passageiro_telefone,
                um.nome AS motorista_nome,
                um.telefone AS motorista_telefone,
                um.foto_url AS motorista_foto_url,
                m.matricula AS motorista_matricula,
                m.marca_veiculo,
                m.modelo_veiculo,
                m.cor_veiculo
             FROM viagens v
             INNER JOIN usuarios u
                ON u.id = v.usuario_id
             LEFT JOIN motoristas m
                ON m.id = v.motorista_id
             LEFT JOIN usuarios um
                ON um.id = m.usuario_id
             WHERE v.id = ?
               AND (
                    v.usuario_id = ?
                    OR m.usuario_id = ?
                    OR EXISTS (
                        SELECT 1
                        FROM usuarios admin
                        WHERE admin.id = ?
                          AND admin.tipo = 'admin'
                    )
               )
             LIMIT 1`,
            [id, usuarioId, usuarioId, usuarioId]
        );

        if (!viagens.length) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Viagem não encontrada ou sem permissão de acesso.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            viagem: viagens[0]
        });

    } catch (erro) {
        return respostaErro(res, erro, 'Erro ao consultar viagem.');
    }
};

// =====================================================
// 4. MOTORISTA ACEITAR VIAGEM
// =====================================================

exports.aceitar = async (req, res) => {
    const viagemId = req.params.id;
    const usuarioId = req.user.id;

    let connection;

    try {
        if (!/^\d+$/.test(viagemId)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID de viagem inválido.'
            });
        }

        connection = await mysql.getConnection();
        await connection.beginTransaction();

        // Verificar motorista
        const motorista = await obterMotorista(connection, usuarioId);

        if (!motorista) {
            await connection.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Perfil de motorista não encontrado.'
            });
        }

        if (motorista.estado_aprovacao !== 'aprovado') {
            await connection.rollback();

            return res.status(403).json({
                sucesso: false,
                mensagem: 'O teu perfil de motorista ainda não está aprovado.'
            });
        }

        // Bloquear registo do motorista
        const [motoristas] = await connection.execute(
            `SELECT id, disponibilidade
             FROM motoristas
             WHERE id = ?
             FOR UPDATE`,
            [motorista.id]
        );

        if (
            !motoristas.length ||
            motoristas[0].disponibilidade !== 'disponivel'
        ) {
            await connection.rollback();

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Não estás disponível para aceitar viagens.'
            });
        }

        // Bloquear registo da viagem
        const [viagens] = await connection.execute(
            `SELECT *
             FROM viagens
             WHERE id = ?
             FOR UPDATE`,
            [viagemId]
        );

        if (!viagens.length) {
            await connection.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Viagem não encontrada.'
            });
        }

        const viagem = viagens[0];

        if (
            !['procurando_motorista', 'pendente'].includes(viagem.estado)
        ) {
            await connection.rollback();

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Esta viagem já não está disponível.'
            });
        }

        if (
            viagem.tipo_viagem === 'agendada' &&
            viagem.data_agendada &&
            new Date(viagem.data_agendada).getTime() <= Date.now()
        ) {
            await connection.rollback();

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Esta viagem agendada já ultrapassou a data prevista.'
            });
        }

        await connection.execute(
            `UPDATE viagens
             SET motorista_id = ?,
                 estado = 'aceite',
                 data_aceite = NOW()
             WHERE id = ?`,
            [motorista.id, viagemId]
        );

        await connection.execute(
            `UPDATE motoristas
             SET disponibilidade = 'ocupado'
             WHERE id = ?`,
            [motorista.id]
        );

        await connection.commit();

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Viagem aceite com sucesso.',
            viagem: {
                id: Number(viagemId),
                motorista_id: motorista.id,
                estado: 'aceite'
            }
        });

    } catch (erro) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        return respostaErro(res, erro, 'Erro ao aceitar viagem.');

    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// 5. ATUALIZAR ESTADO DA VIAGEM
// =====================================================

exports.atualizarEstado = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const usuarioId = req.user.id;

    let connection;

    try {
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID de viagem inválido.'
            });
        }

        connection = await mysql.getConnection();
        await connection.beginTransaction();

        const [viagens] = await connection.execute(
            `SELECT v.*, m.usuario_id AS motorista_usuario_id
             FROM viagens v
             LEFT JOIN motoristas m
                ON m.id = v.motorista_id
             WHERE v.id = ?
             FOR UPDATE`,
            [id]
        );

        if (!viagens.length) {
            await connection.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Viagem não encontrada.'
            });
        }

        const viagem = viagens[0];

        if (ESTADOS_TERMINAIS.includes(viagem.estado)) {
            await connection.rollback();

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Esta viagem já foi finalizada ou cancelada.'
            });
        }

        if (viagem.motorista_usuario_id !== usuarioId) {
            await connection.rollback();

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Não tens permissão para atualizar esta viagem.'
            });
        }

        const proximoEstado = TRANSICOES_MOTORISTA[viagem.estado];

        if (!proximoEstado || estado !== proximoEstado) {
            await connection.rollback();

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Transição de estado inválida.',
                estado_atual: viagem.estado,
                estado_permitido: proximoEstado || null
            });
        }

        if (estado === 'motorista_a_caminho') {
            await connection.execute(
                `UPDATE viagens
                 SET estado = ?
                 WHERE id = ?`,
                [estado, id]
            );
        } else if (estado === 'motorista_chegou') {
            await connection.execute(
                `UPDATE viagens
                 SET estado = ?
                 WHERE id = ?`,
                [estado, id]
            );
        } else if (estado === 'em_andamento') {
            await connection.execute(
                `UPDATE viagens
                 SET estado = ?,
                     data_inicio = NOW()
                 WHERE id = ?`,
                [estado, id]
            );
        } else if (estado === 'concluida') {
            await connection.execute(
                `UPDATE viagens
                 SET estado = 'concluida',
                     data_conclusao = NOW(),
                     preco_final = preco_estimado,
                     duracao_real_minutos =
                        CASE
                            WHEN data_inicio IS NOT NULL
                            THEN TIMESTAMPDIFF(MINUTE, data_inicio, NOW())
                            ELSE NULL
                        END
                 WHERE id = ?`,
                [id]
            );

            await connection.execute(
                `UPDATE motoristas
                 SET disponibilidade = 'disponivel',
                     total_viagens = total_viagens + 1
                 WHERE id = ?`,
                [viagem.motorista_id]
            );
        }

        await connection.commit();

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Estado da viagem atualizado com sucesso.',
            estado
        });

    } catch (erro) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        return respostaErro(res, erro, 'Erro ao atualizar estado da viagem.');

    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// 6. CANCELAR VIAGEM
// =====================================================

exports.cancelar = async (req, res) => {
    const { id } = req.params;
    const { motivo_cancelamento } = req.body;
    const usuarioId = req.user.id;

    let connection;

    try {
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID de viagem inválido.'
            });
        }

        connection = await mysql.getConnection();
        await connection.beginTransaction();

        const [viagens] = await connection.execute(
            `SELECT v.*, m.usuario_id AS motorista_usuario_id
             FROM viagens v
             LEFT JOIN motoristas m
                ON m.id = v.motorista_id
             WHERE v.id = ?
             FOR UPDATE`,
            [id]
        );

        if (!viagens.length) {
            await connection.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Viagem não encontrada.'
            });
        }

        const viagem = viagens[0];

        if (ESTADOS_TERMINAIS.includes(viagem.estado)) {
            await connection.rollback();

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Esta viagem já foi finalizada ou cancelada.'
            });
        }

        let canceladoPor;

        if (viagem.usuario_id === usuarioId) {
            canceladoPor = 'passageiro';
        } else if (viagem.motorista_usuario_id === usuarioId) {
            canceladoPor = 'motorista';
        } else if (req.user.tipo === 'admin') {
            canceladoPor = 'administrador';
        } else {
            await connection.rollback();

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Não tens permissão para cancelar esta viagem.'
            });
        }

        await connection.execute(
            `UPDATE viagens
             SET estado = 'cancelada',
                 motivo_cancelamento = ?,
                 cancelado_por = ?,
                 data_cancelamento = NOW()
             WHERE id = ?`,
            [
                motivo_cancelamento || 'Sem motivo informado.',
                canceladoPor,
                id
            ]
        );

        if (viagem.motorista_id) {
            await connection.execute(
                `UPDATE motoristas
                 SET disponibilidade = 'disponivel'
                 WHERE id = ?
                   AND estado_aprovacao = 'aprovado'`,
                [viagem.motorista_id]
            );
        }

        await connection.commit();

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Viagem cancelada com sucesso.',
            estado: 'cancelada',
            cancelado_por: canceladoPor
        });

    } catch (erro) {
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        return respostaErro(res, erro, 'Erro ao cancelar viagem.');

    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// 7. ATUALIZAR LOCALIZAÇÃO GPS DO MOTORISTA
// =====================================================

exports.atualizarLocalizacao = async (req, res) => {
    const { latitude, longitude } = req.body;
    const usuarioId = req.user.id;

    try {
        if (!validarCoordenadas(latitude, longitude)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Coordenadas GPS inválidas.'
            });
        }

        const motorista = await obterMotorista(mysql, usuarioId);

        if (!motorista) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Motorista não encontrado.'
            });
        }

        if (motorista.estado_aprovacao !== 'aprovado') {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas motoristas aprovados podem atualizar a localização.'
            });
        }

        await mysql.execute(
            `UPDATE motoristas
             SET latitude = ?,
                 longitude = ?
             WHERE usuario_id = ?`,
            [latitude, longitude, usuarioId]
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Localização atualizada com sucesso.',
            localizacao: {
                latitude: Number(latitude),
                longitude: Number(longitude)
            }
        });

    } catch (erro) {
        return respostaErro(res, erro, 'Erro ao atualizar localização.');
    }
};

// =====================================================
// 8. AVALIAR VIAGEM
// =====================================================

exports.avaliar = async (req, res) => {
    const { id } = req.params;
    const {
        avaliacao,
        comentario
    } = req.body;

    const usuarioId = req.user.id;

    try {
        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'ID de viagem inválido.'
            });
        }

        const nota = Number(avaliacao);

        if (
            !Number.isFinite(nota) ||
            nota < 1 ||
            nota > 5
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A avaliação deve estar entre 1 e 5.'
            });
        }

        const [viagens] = await mysql.execute(
            `SELECT v.*, m.usuario_id AS motorista_usuario_id
             FROM viagens v
             LEFT JOIN motoristas m
                ON m.id = v.motorista_id
             WHERE v.id = ?
             LIMIT 1`,
            [id]
        );

        if (!viagens.length) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Viagem não encontrada.'
            });
        }

        const viagem = viagens[0];

        if (viagem.estado !== 'concluida') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Só podes avaliar viagens concluídas.'
            });
        }

        let resultado;

        // Avaliação do passageiro ao motorista
        if (viagem.usuario_id === usuarioId) {
            if (!viagem.motorista_id) {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: 'Esta viagem não possui motorista associado.'
                });
            }

            if (viagem.avaliacao_passageiro !== null) {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: 'Já avaliaste esta viagem.'
                });
            }

            resultado = await mysql.execute(
                `UPDATE viagens
                 SET avaliacao_passageiro = ?,
                     comentario_passageiro = ?
                 WHERE id = ?
                   AND avaliacao_passageiro IS NULL`,
                [nota, comentario || null, id]
            );

        // Avaliação do motorista ao passageiro
        } else if (viagem.motorista_usuario_id === usuarioId) {
            if (viagem.avaliacao_motorista !== null) {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: 'Já avaliaste esta viagem.'
                });
            }

            resultado = await mysql.execute(
                `UPDATE viagens
                 SET avaliacao_motorista = ?,
                     comentario_motorista = ?
                 WHERE id = ?
                   AND avaliacao_motorista IS NULL`,
                [nota, comentario || null, id]
            );

        } else {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Não tens permissão para avaliar esta viagem.'
            });
        }

        if (resultado[0].affectedRows === 0) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'A avaliação já foi registada.'
            });
        }

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Avaliação registada com sucesso.',
            avaliacao: nota
        });

    } catch (erro) {
        return respostaErro(res, erro, 'Erro ao avaliar viagem.');
    }
};
