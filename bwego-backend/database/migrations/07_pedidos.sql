-- =====================================================
-- BWÉ GO
-- TABELA: PEDIDOS
-- =====================================================

CREATE TABLE IF NOT EXISTS pedidos (

    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- Identificação do pedido
    codigo_pedido VARCHAR(50) NOT NULL UNIQUE,

    -- Cliente que realizou o pedido
    usuario_id BIGINT UNSIGNED NOT NULL,

    -- Parceiro responsável pelo pedido (farmácia, supermercado, loja)
    parceiro_id BIGINT UNSIGNED NULL,

    -- Motorista responsável pela entrega
    motorista_id BIGINT UNSIGNED NULL,

    -- Tipo de pedido
    tipo ENUM(
        'supermercado',
        'farmacia',
        'restaurante',
        'loja',
        'outro'
    ) NOT NULL,

    -- Estado do pedido
    estado ENUM(
        'pendente',
        'confirmado',
        'preparando',
        'pronto',
        'aguardando_motorista',
        'em_entrega',
        'entregue',
        'cancelado',
        'reembolsado'
    ) DEFAULT 'pendente',

    -- Informações de recolha
    endereco_recolha TEXT NULL,
    latitude_recolha DECIMAL(10,8) NULL,
    longitude_recolha DECIMAL(11,8) NULL,

    -- Informações de entrega
    endereco_entrega TEXT NOT NULL,
    latitude_entrega DECIMAL(10,8) NULL,
    longitude_entrega DECIMAL(11,8) NULL,

    -- Valores financeiros
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    taxa_entrega DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    desconto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    valor_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Pagamento
    metodo_pagamento ENUM(
        'dinheiro',
        'multicaixa_express',
        'transferencia',
        'carteira'
    ) NOT NULL,

    estado_pagamento ENUM(
        'pendente',
        'pago',
        'falhado',
        'reembolsado'
    ) DEFAULT 'pendente',

    -- Informações adicionais
    observacoes TEXT NULL,
    motivo_cancelamento TEXT NULL,

    -- Datas
    data_confirmacao DATETIME NULL,
    data_preparacao DATETIME NULL,
    data_recolha DATETIME NULL,
    data_entrega DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- Relacionamentos
    CONSTRAINT fk_pedidos_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_pedidos_parceiro
        FOREIGN KEY (parceiro_id)
        REFERENCES parceiros(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_pedidos_motorista
        FOREIGN KEY (motorista_id)
        REFERENCES motoristas(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    -- Índices
    INDEX idx_pedidos_usuario (usuario_id),
    INDEX idx_pedidos_parceiro (parceiro_id),
    INDEX idx_pedidos_motorista (motorista_id),
    INDEX idx_pedidos_estado (estado),
    INDEX idx_pedidos_tipo (tipo),
    INDEX idx_pedidos_data (created_at)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;