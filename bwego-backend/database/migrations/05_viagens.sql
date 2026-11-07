
-- ============================================
-- BWÉ GO
-- TABELA: VIAGENS
-- ============================================

CREATE TABLE IF NOT EXISTS viagens (

    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- RELACIONAMENTOS
    usuario_id BIGINT UNSIGNED NOT NULL,
    motorista_id BIGINT UNSIGNED DEFAULT NULL,

    -- LOCAL DE PARTIDA
    origem_nome VARCHAR(255) NOT NULL,
    origem_endereco TEXT,
    origem_latitude DECIMAL(10,8) NOT NULL,
    origem_longitude DECIMAL(11,8) NOT NULL,

    -- DESTINO
    destino_nome VARCHAR(255) NOT NULL,
    destino_endereco TEXT,
    destino_latitude DECIMAL(10,8) NOT NULL,
    destino_longitude DECIMAL(11,8) NOT NULL,

    -- INFORMAÇÕES DA VIAGEM
    distancia_km DECIMAL(10,2) DEFAULT 0.00,
    duracao_estimada_minutos INT DEFAULT NULL,
    duracao_real_minutos INT DEFAULT NULL,

    tipo_viagem ENUM(
        'imediata',
        'agendada'
    ) DEFAULT 'imediata',

    categoria ENUM(
        'economico',
        'conforto',
        'premium',
        'moto'
    ) NOT NULL DEFAULT 'economico',

    data_agendada DATETIME DEFAULT NULL,

    numero_passageiros INT DEFAULT 1,

    -- VALORES
    preco_estimado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    preco_final DECIMAL(12,2) DEFAULT NULL,
    taxa_plataforma DECIMAL(12,2) DEFAULT 0.00,

    moeda VARCHAR(10) DEFAULT 'AOA',

    -- ESTADO DA VIAGEM
    estado ENUM(
        'pendente',
        'procurando_motorista',
        'aceite',
        'motorista_a_caminho',
        'motorista_chegou',
        'em_andamento',
        'concluida',
        'cancelada',
        'rejeitada'
    ) DEFAULT 'pendente',

    motivo_cancelamento TEXT DEFAULT NULL,

    cancelado_por ENUM(
        'passageiro',
        'motorista',
        'administrador'
    ) DEFAULT NULL,

    -- PAGAMENTO
    estado_pagamento ENUM(
        'pendente',
        'pago',
        'falhado',
        'reembolsado'
    ) DEFAULT 'pendente',

    metodo_pagamento ENUM(
        'dinheiro',
        'carteira',
        'multicaixa',
        'transferencia'
    ) DEFAULT NULL,

    -- AVALIAÇÕES
    avaliacao_passageiro DECIMAL(2,1) DEFAULT NULL,
    comentario_passageiro TEXT DEFAULT NULL,

    avaliacao_motorista DECIMAL(2,1) DEFAULT NULL,
    comentario_motorista TEXT DEFAULT NULL,

    -- DATAS
    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aceite DATETIME DEFAULT NULL,
    data_inicio DATETIME DEFAULT NULL,
    data_conclusao DATETIME DEFAULT NULL,
    data_cancelamento DATETIME DEFAULT NULL,

    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- CHAVES ESTRANGEIRAS
    CONSTRAINT fk_viagem_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_viagem_motorista
        FOREIGN KEY (motorista_id)
        REFERENCES motoristas(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    -- ÍNDICES
    INDEX idx_viagem_usuario (usuario_id),
    INDEX idx_viagem_motorista (motorista_id),
    INDEX idx_viagem_estado (estado),
    INDEX idx_viagem_pagamento (estado_pagamento),
    INDEX idx_viagem_data (data_solicitacao),
    INDEX idx_viagem_agendada (data_agendada)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
