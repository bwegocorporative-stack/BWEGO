
-- =====================================================
-- BWÉ GO
-- TABELA: PAGAMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS pagamentos (

    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- Identificação do pagamento
    codigo_pagamento VARCHAR(60) NOT NULL UNIQUE,

    -- Cliente responsável pelo pagamento
    usuario_id BIGINT UNSIGNED NOT NULL,

    -- Referências aos serviços
    pedido_id BIGINT UNSIGNED NULL,
    viagem_id BIGINT UNSIGNED NULL,

    -- Tipo de serviço
    tipo_servico ENUM(
        'viagem',
        'entrega',
        'supermercado',
        'farmacia',
        'restaurante',
        'loja',
        'outro'
    ) NOT NULL,

    -- Valores financeiros
    valor DECIMAL(12,2) NOT NULL,
    taxa_servico DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    desconto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    valor_total DECIMAL(12,2) NOT NULL,

    moeda VARCHAR(5) NOT NULL DEFAULT 'AOA',

    -- Método de pagamento
    metodo_pagamento ENUM(
        'dinheiro',
        'multicaixa_express',
        'transferencia',
        'carteira',
        'cartao'
    ) NOT NULL,

    -- Estado do pagamento
    estado ENUM(
        'pendente',
        'processando',
        'pago',
        'falhado',
        'cancelado',
        'reembolsado',
        'parcialmente_reembolsado'
    ) NOT NULL DEFAULT 'pendente',

    -- Referência externa
    referencia_transacao VARCHAR(150) NULL,
    provedor_pagamento VARCHAR(100) NULL,

    -- Informações adicionais
    descricao TEXT NULL,
    comprovativo_url TEXT NULL,
    motivo_falha TEXT NULL,
    motivo_reembolso TEXT NULL,

    -- Datas
    data_pagamento DATETIME NULL,
    data_reembolso DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- Relacionamentos
    CONSTRAINT fk_pagamentos_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_pagamentos_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_pagamentos_viagem
        FOREIGN KEY (viagem_id)
        REFERENCES viagens(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Validações financeiras
    CONSTRAINT chk_pagamentos_valor
        CHECK (valor >= 0),

    CONSTRAINT chk_pagamentos_taxa
        CHECK (taxa_servico >= 0),

    CONSTRAINT chk_pagamentos_desconto
        CHECK (desconto >= 0),

    CONSTRAINT chk_pagamentos_total
        CHECK (valor_total >= 0),

    -- Índices
    INDEX idx_pagamentos_usuario (usuario_id),
    INDEX idx_pagamentos_pedido (pedido_id),
    INDEX idx_pagamentos_viagem (viagem_id),
    INDEX idx_pagamentos_estado (estado),
    INDEX idx_pagamentos_metodo (metodo_pagamento),
    INDEX idx_pagamentos_data (created_at),
    INDEX idx_pagamentos_referencia (referencia_transacao)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
