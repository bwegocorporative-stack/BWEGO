
-- ============================================
-- BWÉ GO
-- TABELA: PRODUTOS
-- ============================================

CREATE TABLE IF NOT EXISTS produtos (

    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- IDENTIFICAÇÃO
    parceiro_id BIGINT UNSIGNED NOT NULL,

    codigo_produto VARCHAR(100) DEFAULT NULL,
    nome VARCHAR(200) NOT NULL,
    slug VARCHAR(220) DEFAULT NULL,

    descricao TEXT DEFAULT NULL,

    -- CATEGORIA
    categoria VARCHAR(150) NOT NULL,
    subcategoria VARCHAR(150) DEFAULT NULL,

    -- PREÇOS
    preco DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    preco_promocional DECIMAL(12,2) DEFAULT NULL,

    moeda VARCHAR(10) DEFAULT 'AOA',

    -- STOCK
    quantidade_stock INT UNSIGNED DEFAULT 0,
    stock_minimo INT UNSIGNED DEFAULT 0,

    controlar_stock BOOLEAN DEFAULT TRUE,

    -- CARACTERÍSTICAS
    marca VARCHAR(150) DEFAULT NULL,
    unidade_medida ENUM(
        'unidade',
        'kg',
        'g',
        'litro',
        'ml',
        'pacote',
        'caixa',
        'outro'
    ) DEFAULT 'unidade',

    peso DECIMAL(10,3) DEFAULT NULL,

    -- IMAGENS
    imagem_principal VARCHAR(500) DEFAULT NULL,

    -- DISPONIBILIDADE
    estado ENUM(
        'ativo',
        'inativo',
        'esgotado',
        'suspenso'
    ) DEFAULT 'ativo',

    destaque BOOLEAN DEFAULT FALSE,

    -- INFORMAÇÕES ADICIONAIS
    observacoes TEXT DEFAULT NULL,

    -- ESTATÍSTICAS
    total_vendas INT UNSIGNED DEFAULT 0,
    total_visualizacoes INT UNSIGNED DEFAULT 0,

    -- DATAS
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- RELACIONAMENTO
    CONSTRAINT fk_produto_parceiro
        FOREIGN KEY (parceiro_id)
        REFERENCES parceiros(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- RESTRIÇÕES E ÍNDICES
    UNIQUE KEY uk_produto_codigo_parceiro (
        parceiro_id,
        codigo_produto
    ),

    INDEX idx_produto_parceiro (parceiro_id),
    INDEX idx_produto_nome (nome),
    INDEX idx_produto_categoria (categoria),
    INDEX idx_produto_estado (estado),
    INDEX idx_produto_preco (preco),
    INDEX idx_produto_destaque (destaque)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
