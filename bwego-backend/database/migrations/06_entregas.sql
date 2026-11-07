
-- ============================================
-- BWÉ GO
-- TABELA: ENTREGAS
-- ============================================

CREATE TABLE IF NOT EXISTS entregas (

    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- IDENTIFICAÇÃO
    codigo_entrega VARCHAR(50) NOT NULL UNIQUE,

    usuario_id BIGINT UNSIGNED NOT NULL,
    motorista_id BIGINT UNSIGNED DEFAULT NULL,

    -- TIPO DE ENTREGA
    tipo_entrega ENUM(
        'documentos',
        'encomendas',
        'supermercado',
        'farmacia',
        'alimentacao',
        'outros'
    ) DEFAULT 'encomendas',

    descricao TEXT,
    observacoes TEXT,

    -- REMETENTE
    remetente_nome VARCHAR(150) NOT NULL,
    remetente_telefone VARCHAR(30) NOT NULL,

    -- LOCAL DE RECOLHA
    origem_nome VARCHAR(255) NOT NULL,
    origem_endereco TEXT NOT NULL,
    origem_latitude DECIMAL(10,8) DEFAULT NULL,
    origem_longitude DECIMAL(11,8) DEFAULT NULL,

    -- DESTINATÁRIO
    destinatario_nome VARCHAR(150) NOT NULL,
    destinatario_telefone VARCHAR(30) NOT NULL,

    -- LOCAL DE ENTREGA
    destino_nome VARCHAR(255) NOT NULL,
    destino_endereco TEXT NOT NULL,
    destino_latitude DECIMAL(10,8) DEFAULT NULL,
    destino_longitude DECIMAL(11,8) DEFAULT NULL,

    -- INFORMAÇÕES DA ENCOMENDA
    quantidade INT UNSIGNED DEFAULT 1,
    peso_kg DECIMAL(10,2) DEFAULT NULL,

    valor_declarado DECIMAL(12,2) DEFAULT 0.00,

    -- DISTÂNCIA E TEMPO
    distancia_km DECIMAL(10,2) DEFAULT 0.00,
    duracao_estimada_minutos INT DEFAULT NULL,

    -- PREÇOS
    preco_estimado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    preco_final DECIMAL(12,2) DEFAULT NULL,
    taxa_plataforma DECIMAL(12,2) DEFAULT 0.00,

    moeda VARCHAR(10) DEFAULT 'AOA',

    -- ESTADO DA ENTREGA
    estado ENUM(
        'pendente',
        'procurando_estafeta',
        'aceite',
        'a_caminho_recolha',
        'recolhida',
        'em_transito',
        'entregue',
        'cancelada',
        'rejeitada'
    ) DEFAULT 'pendente',

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

    -- CONFIRMAÇÃO DE ENTREGA
    codigo_confirmacao VARCHAR(10) DEFAULT NULL,
    comprovativo_entrega VARCHAR(500) DEFAULT NULL,
    recebido_por VARCHAR(150) DEFAULT NULL,

    -- CANCELAMENTO
    motivo_cancelamento TEXT DEFAULT NULL,

    cancelado_por ENUM(
        'cliente',
        'estafeta',
        'administrador'
    ) DEFAULT NULL,

    -- AVALIAÇÃO
    avaliacao_cliente DECIMAL(2,1) DEFAULT NULL,
    comentario_cliente TEXT DEFAULT NULL,

    -- DATAS
    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aceite DATETIME DEFAULT NULL,
    data_recolha DATETIME DEFAULT NULL,
    data_entrega DATETIME DEFAULT NULL,
    data_cancelamento DATETIME DEFAULT NULL,

    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- RELACIONAMENTOS
    CONSTRAINT fk_entrega_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_entrega_motorista
        FOREIGN KEY (motorista_id)
        REFERENCES motoristas(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    -- ÍNDICES
    INDEX idx_entrega_usuario (usuario_id),
    INDEX idx_entrega_motorista (motorista_id),
    INDEX idx_entrega_estado (estado),
    INDEX idx_entrega_tipo (tipo_entrega),
    INDEX idx_entrega_pagamento (estado_pagamento),
    INDEX idx_entrega_data (data_solicitacao)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
