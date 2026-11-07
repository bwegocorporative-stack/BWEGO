
-- ============================================
-- BWÉ GO
-- TABELA: MOTORISTAS
-- ============================================

CREATE TABLE IF NOT EXISTS motoristas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    usuario_id BIGINT UNSIGNED NOT NULL,

    numero_carta_conducao VARCHAR(100) NOT NULL,
    categoria_carta VARCHAR(50) NOT NULL,
    validade_carta DATE NOT NULL,

    numero_bi VARCHAR(50) NOT NULL,
    data_nascimento DATE NOT NULL,

    marca_veiculo VARCHAR(100) NOT NULL,
    modelo_veiculo VARCHAR(100) NOT NULL,
    matricula VARCHAR(50) NOT NULL,
    cor_veiculo VARCHAR(50),

    ano_veiculo YEAR,
    capacidade_passageiros INT DEFAULT 4,

    documento_bi VARCHAR(500),
    documento_carta VARCHAR(500),
    documento_veiculo VARCHAR(500),
    foto_motorista VARCHAR(500),

    estado_aprovacao ENUM(
        'pendente',
        'aprovado',
        'rejeitado',
        'suspenso'
    ) DEFAULT 'pendente',

    disponibilidade ENUM(
        'disponivel',
        'ocupado',
        'offline'
    ) DEFAULT 'offline',

    avaliacao_media DECIMAL(3,2) DEFAULT 0.00,
    total_viagens INT UNSIGNED DEFAULT 0,

    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    localizacao_atualizada_em TIMESTAMP NULL DEFAULT NULL,

    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_motorista_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    UNIQUE KEY uk_motorista_usuario (usuario_id),
    UNIQUE KEY uk_motorista_carta (numero_carta_conducao),
    UNIQUE KEY uk_motorista_matricula (matricula),
    UNIQUE KEY uk_motorista_bi (numero_bi),

    INDEX idx_motorista_estado (estado_aprovacao),
    INDEX idx_motorista_disponibilidade (disponibilidade),
    INDEX idx_motorista_localizacao (latitude, longitude)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
