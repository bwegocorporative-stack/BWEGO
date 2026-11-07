
-- ============================================
-- BWÉ GO
-- TABELA: PARCEIROS
-- ============================================

CREATE TABLE IF NOT EXISTS parceiros (

    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- IDENTIFICAÇÃO DO PARCEIRO
    usuario_id BIGINT UNSIGNED DEFAULT NULL,

    nome_comercial VARCHAR(200) NOT NULL,
    nome_empresa VARCHAR(200) DEFAULT NULL,

    nif VARCHAR(50) DEFAULT NULL,
    tipo_empresa ENUM(
        'supermercado',
        'farmacia',
        'restaurante',
        'loja',
        'mercearia',
        'distribuidor',
        'outros'
    ) NOT NULL DEFAULT 'outros',

    descricao TEXT DEFAULT NULL,

    -- CONTACTOS
    email VARCHAR(150) DEFAULT NULL,
    telefone VARCHAR(30) NOT NULL,
    telefone_secundario VARCHAR(30) DEFAULT NULL,
    website VARCHAR(255) DEFAULT NULL,

    -- LOCALIZAÇÃO
    provincia VARCHAR(100) DEFAULT NULL,
    municipio VARCHAR(100) DEFAULT NULL,
    bairro VARCHAR(150) DEFAULT NULL,

    endereco TEXT NOT NULL,

    latitude DECIMAL(10,8) DEFAULT NULL,
    longitude DECIMAL(11,8) DEFAULT NULL,

    -- IMAGENS
    logotipo VARCHAR(500) DEFAULT NULL,
    imagem_capa VARCHAR(500) DEFAULT NULL,

    -- DOCUMENTAÇÃO
    documento_nif VARCHAR(500) DEFAULT NULL,
    documento_alvara VARCHAR(500) DEFAULT NULL,
    documento_identificacao VARCHAR(500) DEFAULT NULL,

    -- FUNCIONAMENTO
    horario_abertura TIME DEFAULT NULL,
    horario_fechamento TIME DEFAULT NULL,

    funcionamento_24h BOOLEAN DEFAULT FALSE,

    -- SERVIÇOS
    aceita_entregas BOOLEAN DEFAULT TRUE,
    aceita_recolha_local BOOLEAN DEFAULT TRUE,

    -- COMISSÕES
    taxa_comissao DECIMAL(5,2) DEFAULT 0.00,

    -- ESTADO DO PARCEIRO
    estado_aprovacao ENUM(
        'pendente',
        'aprovado',
        'rejeitado',
        'suspenso'
    ) DEFAULT 'pendente',

    estado_funcionamento ENUM(
        'aberto',
        'fechado',
        'temporariamente_fechado'
    ) DEFAULT 'fechado',

    -- AVALIAÇÃO
    avaliacao_media DECIMAL(3,2) DEFAULT 0.00,
    total_avaliacoes INT UNSIGNED DEFAULT 0,

    -- CONTROLO
    motivo_rejeicao TEXT DEFAULT NULL,

    data_aprovacao DATETIME DEFAULT NULL,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- RELACIONAMENTO COM USUARIOS
    CONSTRAINT fk_parceiro_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    -- RESTRIÇÕES
    UNIQUE KEY uk_parceiro_nif (nif),

    -- ÍNDICES
    INDEX idx_parceiro_usuario (usuario_id),
    INDEX idx_parceiro_tipo (tipo_empresa),
    INDEX idx_parceiro_estado (estado_aprovacao),
    INDEX idx_parceiro_funcionamento (estado_funcionamento),
    INDEX idx_parceiro_localizacao (latitude, longitude),
    INDEX idx_parceiro_municipio (municipio)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
