-- =====================================================
-- BWÉ GO
-- TABELA: ITENS_PEDIDOS
-- =====================================================

CREATE TABLE IF NOT EXISTS itens_pedidos (

    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- Relacionamento com o pedido
    pedido_id BIGINT UNSIGNED NOT NULL,

    -- Produto selecionado
    produto_id BIGINT UNSIGNED NOT NULL,

    -- Informações do produto no momento da compra
    nome_produto VARCHAR(200) NOT NULL,
    descricao_produto TEXT NULL,

    -- Quantidade e valores
    quantidade INT UNSIGNED NOT NULL DEFAULT 1,

    preco_unitario DECIMAL(12,2) NOT NULL,

    desconto DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Estado individual do item
    estado ENUM(
        'pendente',
        'confirmado',
        'indisponivel',
        'cancelado',
        'entregue'
    ) DEFAULT 'pendente',

    -- Observações
    observacoes TEXT NULL,

    -- Datas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- Relacionamentos
    CONSTRAINT fk_itens_pedidos_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_itens_pedidos_produto
        FOREIGN KEY (produto_id)
        REFERENCES produtos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Validações
    CONSTRAINT chk_itens_quantidade
        CHECK (quantidade > 0),

    CONSTRAINT chk_itens_preco
        CHECK (preco_unitario >= 0),

    CONSTRAINT chk_itens_desconto
        CHECK (desconto >= 0),

    CONSTRAINT chk_itens_subtotal
        CHECK (subtotal >= 0),

    -- Índices
    INDEX idx_itens_pedido (pedido_id),
    INDEX idx_itens_produto (produto_id),
    INDEX idx_itens_estado (estado)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;