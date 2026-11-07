-- ============================================================
-- BWÉ GO - SCHEMA COMPLETO MYSQL 8
-- Plataforma de mobilidade urbana, entregas e comércio
-- Charset: utf8mb4 | Engine: InnoDB
--
-- IMPORTANTE:
-- 1. Faça backup antes de executar num banco existente.
-- 2. Este script cria tabelas caso ainda não existam.
-- 3. Não contém credenciais nem dados de utilizadores.
-- ============================================================

CREATE DATABASE IF NOT EXISTS bwego
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bwego;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ============================================================
-- 01. UTILIZADORES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(190) NULL,
    telefone VARCHAR(30) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo ENUM('cliente', 'motorista', 'admin', 'parceiro') NOT NULL DEFAULT 'cliente',
    foto_url VARCHAR(500) NULL,
    foto_public_id VARCHAR(255) NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    email_verificado TINYINT(1) NOT NULL DEFAULT 0,
    telefone_verificado TINYINT(1) NOT NULL DEFAULT 0,
    ultimo_login DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_telefone (telefone),
    KEY idx_users_tipo_ativo (tipo, ativo)
) ENGINE=InnoDB;

-- ============================================================
-- 02. MOTORISTAS, VEÍCULOS E DOCUMENTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS motoristas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NOT NULL,
    numero_carta VARCHAR(100) NULL,
    data_validade_carta DATE NULL,
    verificado TINYINT(1) NOT NULL DEFAULT 0,
    disponivel TINYINT(1) NOT NULL DEFAULT 0,
    estado ENUM('pendente', 'aprovado', 'rejeitado', 'suspenso') NOT NULL DEFAULT 'pendente',
    nota_media DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_viagens INT UNSIGNED NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_motoristas_usuario (usuario_id),
    CONSTRAINT fk_motoristas_usuario
      FOREIGN KEY (usuario_id) REFERENCES users(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_motoristas_estado_disponivel (estado, disponivel)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS veiculos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    motorista_id BIGINT UNSIGNED NOT NULL,
    marca VARCHAR(80) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    cor VARCHAR(50) NOT NULL,
    matricula VARCHAR(30) NOT NULL,
    ano SMALLINT UNSIGNED NULL,
    categoria ENUM('economico', 'conforto', 'premium', 'moto', 'van') NOT NULL DEFAULT 'economico',
    capacidade TINYINT UNSIGNED NOT NULL DEFAULT 4,
    foto_url VARCHAR(500) NULL,
    foto_public_id VARCHAR(255) NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_veiculos_matricula (matricula),
    CONSTRAINT fk_veiculos_motorista
      FOREIGN KEY (motorista_id) REFERENCES motoristas(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_veiculos_motorista_ativo (motorista_id, ativo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS documentos_motoristas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    motorista_id BIGINT UNSIGNED NOT NULL,
    tipo ENUM('bi', 'carta_conducao', 'livrete', 'seguro', 'outro') NOT NULL,
    numero_documento VARCHAR(100) NULL,
    url_arquivo VARCHAR(500) NOT NULL,
    public_id VARCHAR(255) NULL,
    data_validade DATE NULL,
    estado ENUM('pendente', 'aprovado', 'rejeitado', 'expirado') NOT NULL DEFAULT 'pendente',
    observacao VARCHAR(500) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_documentos_motoristas_motorista
      FOREIGN KEY (motorista_id) REFERENCES motoristas(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_documentos_motorista_estado (motorista_id, estado)
) ENGINE=InnoDB;

-- ============================================================
-- 03. ENDEREÇOS
-- ============================================================

CREATE TABLE IF NOT EXISTS enderecos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NOT NULL,
    nome VARCHAR(80) NOT NULL DEFAULT 'Casa',
    endereco VARCHAR(255) NOT NULL,
    referencia VARCHAR(255) NULL,
    cidade VARCHAR(100) NOT NULL DEFAULT 'Luanda',
    provincia VARCHAR(100) NOT NULL DEFAULT 'Luanda',
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    principal TINYINT(1) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_enderecos_usuario
      FOREIGN KEY (usuario_id) REFERENCES users(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_enderecos_usuario (usuario_id)
) ENGINE=InnoDB;

-- ============================================================
-- 04. VIAGENS (BWÉ RIDE)
-- ============================================================

CREATE TABLE IF NOT EXISTS viagens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id BIGINT UNSIGNED NOT NULL,
    motorista_id BIGINT UNSIGNED NULL,
    veiculo_id BIGINT UNSIGNED NULL,
    origem_endereco VARCHAR(255) NOT NULL,
    origem_latitude DECIMAL(10,7) NOT NULL,
    origem_longitude DECIMAL(10,7) NOT NULL,
    destino_endereco VARCHAR(255) NOT NULL,
    destino_latitude DECIMAL(10,7) NOT NULL,
    destino_longitude DECIMAL(10,7) NOT NULL,
    distancia_km DECIMAL(8,2) NULL,
    duracao_minutos INT UNSIGNED NULL,
    preco_estimado DECIMAL(12,2) NULL,
    preco_final DECIMAL(12,2) NULL,
    moeda CHAR(3) NOT NULL DEFAULT 'AOA',
    estado ENUM('pendente', 'aceite', 'motorista_a_caminho', 'passageiro_a_bordo', 'em_andamento', 'concluida', 'cancelada') NOT NULL DEFAULT 'pendente',
    motivo_cancelamento VARCHAR(255) NULL,
    solicitado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aceite_em DATETIME NULL,
    iniciado_em DATETIME NULL,
    concluido_em DATETIME NULL,
    cancelado_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_viagens_cliente
      FOREIGN KEY (cliente_id) REFERENCES users(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_viagens_motorista
      FOREIGN KEY (motorista_id) REFERENCES motoristas(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_viagens_veiculo
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_viagens_cliente_estado (cliente_id, estado),
    KEY idx_viagens_motorista_estado (motorista_id, estado),
    KEY idx_viagens_criado (criado_em)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS localizacoes_motoristas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    motorista_id BIGINT UNSIGNED NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    velocidade DECIMAL(6,2) NULL,
    direcao DECIMAL(6,2) NULL,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_localizacao_motorista (motorista_id),
    CONSTRAINT fk_localizacoes_motoristas_motorista
      FOREIGN KEY (motorista_id) REFERENCES motoristas(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_localizacao_coordenadas (latitude, longitude)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historico_localizacoes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    viagem_id BIGINT UNSIGNED NOT NULL,
    motorista_id BIGINT UNSIGNED NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    registado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hist_local_viagem
      FOREIGN KEY (viagem_id) REFERENCES viagens(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_hist_local_motorista
      FOREIGN KEY (motorista_id) REFERENCES motoristas(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_hist_local_viagem_tempo (viagem_id, registado_em)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historico_viagens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    viagem_id BIGINT UNSIGNED NOT NULL,
    estado ENUM('pendente', 'aceite', 'motorista_a_caminho', 'passageiro_a_bordo', 'em_andamento', 'concluida', 'cancelada') NOT NULL,
    alterado_por BIGINT UNSIGNED NULL,
    observacao VARCHAR(500) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historico_viagens_viagem
      FOREIGN KEY (viagem_id) REFERENCES viagens(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_historico_viagens_usuario
      FOREIGN KEY (alterado_por) REFERENCES users(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_historico_viagens_viagem_data (viagem_id, criado_em)
) ENGINE=InnoDB;

-- ============================================================
-- 05. ENTREGAS (BWÉ EXPRESS)
-- ============================================================

CREATE TABLE IF NOT EXISTS entregas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id BIGINT UNSIGNED NOT NULL,
    entregador_id BIGINT UNSIGNED NULL,
    tipo ENUM('documento', 'encomenda', 'compras', 'outro') NOT NULL DEFAULT 'encomenda',
    descricao VARCHAR(500) NOT NULL,
    remetente_nome VARCHAR(150) NOT NULL,
    remetente_telefone VARCHAR(30) NOT NULL,
    origem_endereco VARCHAR(255) NOT NULL,
    origem_latitude DECIMAL(10,7) NOT NULL,
    origem_longitude DECIMAL(10,7) NOT NULL,
    destinatario_nome VARCHAR(150) NOT NULL,
    destinatario_telefone VARCHAR(30) NOT NULL,
    destino_endereco VARCHAR(255) NOT NULL,
    destino_latitude DECIMAL(10,7) NOT NULL,
    destino_longitude DECIMAL(10,7) NOT NULL,
    preco_estimado DECIMAL(12,2) NULL,
    preco_final DECIMAL(12,2) NULL,
    moeda CHAR(3) NOT NULL DEFAULT 'AOA',
    estado ENUM('pendente', 'aceite', 'recolhida', 'em_transito', 'entregue', 'cancelada') NOT NULL DEFAULT 'pendente',
    solicitado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recolhido_em DATETIME NULL,
    entregue_em DATETIME NULL,
    cancelado_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_entregas_cliente
      FOREIGN KEY (cliente_id) REFERENCES users(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_entregas_entregador
      FOREIGN KEY (entregador_id) REFERENCES motoristas(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_entregas_cliente_estado (cliente_id, estado),
    KEY idx_entregas_entregador_estado (entregador_id, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historico_entregas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entrega_id BIGINT UNSIGNED NOT NULL,
    estado ENUM('pendente', 'aceite', 'recolhida', 'em_transito', 'entregue', 'cancelada') NOT NULL,
    alterado_por BIGINT UNSIGNED NULL,
    observacao VARCHAR(500) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historico_entregas_entrega
      FOREIGN KEY (entrega_id) REFERENCES entregas(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_historico_entregas_usuario
      FOREIGN KEY (alterado_por) REFERENCES users(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_historico_entregas_data (entrega_id, criado_em)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comprovativos_entrega (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entrega_id BIGINT UNSIGNED NOT NULL,
    url_arquivo VARCHAR(500) NOT NULL,
    public_id VARCHAR(255) NULL,
    tipo ENUM('foto', 'assinatura', 'codigo') NOT NULL DEFAULT 'foto',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comprovativos_entrega
      FOREIGN KEY (entrega_id) REFERENCES entregas(id)
      ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 06. PARCEIROS, CATEGORIAS, PRODUTOS E STOCK
-- ============================================================

CREATE TABLE IF NOT EXISTS parceiros (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NULL,
    nome VARCHAR(180) NOT NULL,
    tipo ENUM('supermercado', 'farmacia', 'restaurante', 'loja', 'outro') NOT NULL,
    descricao TEXT NULL,
    telefone VARCHAR(30) NOT NULL,
    email VARCHAR(190) NULL,
    endereco VARCHAR(255) NOT NULL,
    cidade VARCHAR(100) NOT NULL DEFAULT 'Luanda',
    provincia VARCHAR(100) NOT NULL DEFAULT 'Luanda',
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    logo_url VARCHAR(500) NULL,
    logo_public_id VARCHAR(255) NULL,
    verificado TINYINT(1) NOT NULL DEFAULT 0,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_parceiros_usuario
      FOREIGN KEY (usuario_id) REFERENCES users(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_parceiros_tipo_ativo (tipo, ativo),
    KEY idx_parceiros_localizacao (latitude, longitude)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categorias_produtos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parceiro_id BIGINT UNSIGNED NULL,
    nome VARCHAR(120) NOT NULL,
    descricao VARCHAR(500) NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categorias_parceiro
      FOREIGN KEY (parceiro_id) REFERENCES parceiros(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_categorias_parceiro (parceiro_id, ativo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS produtos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parceiro_id BIGINT UNSIGNED NOT NULL,
    categoria_id BIGINT UNSIGNED NULL,
    nome VARCHAR(180) NOT NULL,
    descricao TEXT NULL,
    codigo_sku VARCHAR(100) NULL,
    tipo ENUM('produto', 'medicamento', 'alimento', 'outro') NOT NULL DEFAULT 'produto',
    preco DECIMAL(12,2) NOT NULL,
    moeda CHAR(3) NOT NULL DEFAULT 'AOA',
    requer_receita TINYINT(1) NOT NULL DEFAULT 0,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_produtos_parceiro
      FOREIGN KEY (parceiro_id) REFERENCES parceiros(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_produtos_categoria
      FOREIGN KEY (categoria_id) REFERENCES categorias_produtos(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE KEY uq_produtos_parceiro_sku (parceiro_id, codigo_sku),
    KEY idx_produtos_parceiro_ativo (parceiro_id, ativo),
    KEY idx_produtos_nome (nome)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS imagens_produtos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    produto_id BIGINT UNSIGNED NOT NULL,
    url_imagem VARCHAR(500) NOT NULL,
    public_id VARCHAR(255) NULL,
    principal TINYINT(1) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_imagens_produto
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_imagens_produto (produto_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS estoque (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    produto_id BIGINT UNSIGNED NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    quantidade_reservada INT NOT NULL DEFAULT 0,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_estoque_produto (produto_id),
    CONSTRAINT fk_estoque_produto
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CHECK (quantidade >= 0),
    CHECK (quantidade_reservada >= 0)
) ENGINE=InnoDB;

-- ============================================================
-- 07. PEDIDOS DE COMPRAS
-- ============================================================

CREATE TABLE IF NOT EXISTS pedidos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id BIGINT UNSIGNED NOT NULL,
    parceiro_id BIGINT UNSIGNED NOT NULL,
    entregador_id BIGINT UNSIGNED NULL,
    endereco_entrega_id BIGINT UNSIGNED NULL,
    endereco_entrega VARCHAR(255) NOT NULL,
    entrega_latitude DECIMAL(10,7) NOT NULL,
    entrega_longitude DECIMAL(10,7) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    taxa_entrega DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    desconto DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    moeda CHAR(3) NOT NULL DEFAULT 'AOA',
    estado ENUM('pendente', 'confirmado', 'em_preparacao', 'pronto', 'em_entrega', 'entregue', 'cancelado') NOT NULL DEFAULT 'pendente',
    observacao VARCHAR(500) NULL,
    solicitado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmado_em DATETIME NULL,
    entregue_em DATETIME NULL,
    cancelado_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedidos_cliente
      FOREIGN KEY (cliente_id) REFERENCES users(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pedidos_parceiro
      FOREIGN KEY (parceiro_id) REFERENCES parceiros(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pedidos_entregador
      FOREIGN KEY (entregador_id) REFERENCES motoristas(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pedidos_endereco
      FOREIGN KEY (endereco_entrega_id) REFERENCES enderecos(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_pedidos_cliente_estado (cliente_id, estado),
    KEY idx_pedidos_parceiro_estado (parceiro_id, estado),
    KEY idx_pedidos_entregador_estado (entregador_id, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS itens_pedidos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id BIGINT UNSIGNED NOT NULL,
    produto_id BIGINT UNSIGNED NULL,
    nome_produto VARCHAR(180) NOT NULL,
    quantidade INT UNSIGNED NOT NULL,
    preco_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_itens_pedido
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_itens_produto
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_itens_pedido (pedido_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historico_pedidos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id BIGINT UNSIGNED NOT NULL,
    estado ENUM('pendente', 'confirmado', 'em_preparacao', 'pronto', 'em_entrega', 'entregue', 'cancelado') NOT NULL,
    alterado_por BIGINT UNSIGNED NULL,
    observacao VARCHAR(500) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historico_pedido
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_historico_pedido_usuario
      FOREIGN KEY (alterado_por) REFERENCES users(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_historico_pedido_data (pedido_id, criado_em)
) ENGINE=InnoDB;

-- ============================================================
-- 08. PAGAMENTOS, CARTEIRAS E TRANSAÇÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS pagamentos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    viagem_id BIGINT UNSIGNED NULL,
    pedido_id BIGINT UNSIGNED NULL,
    entrega_id BIGINT UNSIGNED NULL,
    cliente_id BIGINT UNSIGNED NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    moeda CHAR(3) NOT NULL DEFAULT 'AOA',
    metodo ENUM('dinheiro', 'multicaixa', 'transferencia', 'carteira', 'cartao', 'outro') NOT NULL,
    estado ENUM('pendente', 'pago', 'falhado', 'reembolsado', 'cancelado') NOT NULL DEFAULT 'pendente',
    referencia VARCHAR(190) NULL,
    provedor VARCHAR(100) NULL,
    pago_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pagamentos_viagem
      FOREIGN KEY (viagem_id) REFERENCES viagens(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pagamentos_pedido
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pagamentos_entrega
      FOREIGN KEY (entrega_id) REFERENCES entregas(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pagamentos_cliente
      FOREIGN KEY (cliente_id) REFERENCES users(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    KEY idx_pagamentos_cliente_estado (cliente_id, estado),
    KEY idx_pagamentos_referencia (referencia)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carteiras (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NOT NULL,
    saldo DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    moeda CHAR(3) NOT NULL DEFAULT 'AOA',
    estado ENUM('ativa', 'bloqueada', 'encerrada') NOT NULL DEFAULT 'ativa',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_carteiras_usuario (usuario_id),
    CONSTRAINT fk_carteiras_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (saldo >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transacoes_carteira (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    carteira_id BIGINT UNSIGNED NOT NULL,
    pagamento_id BIGINT UNSIGNED NULL,
    tipo ENUM('credito', 'debito', 'reembolso', 'ajuste') NOT NULL,
    valor DECIMAL(14,2) NOT NULL,
    saldo_anterior DECIMAL(14,2) NOT NULL,
    saldo_posterior DECIMAL(14,2) NOT NULL,
    descricao VARCHAR(255) NULL,
    referencia VARCHAR(190) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transacoes_carteira
      FOREIGN KEY (carteira_id) REFERENCES carteiras(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_transacoes_pagamento
      FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_transacoes_carteira_data (carteira_id, criado_em)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reembolsos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pagamento_id BIGINT UNSIGNED NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    estado ENUM('pendente', 'processado', 'falhado') NOT NULL DEFAULT 'pendente',
    referencia_provedor VARCHAR(190) NULL,
    processado_em DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reembolsos_pagamento
      FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    KEY idx_reembolsos_pagamento_estado (pagamento_id, estado)
) ENGINE=InnoDB;

-- ============================================================
-- 09. NOTIFICAÇÕES, AVALIAÇÕES, CUPÕES E SESSÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS notificacoes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NOT NULL,
    titulo VARCHAR(180) NOT NULL,
    mensagem VARCHAR(1000) NOT NULL,
    tipo ENUM('viagem', 'entrega', 'pedido', 'pagamento', 'sistema', 'promocao') NOT NULL DEFAULT 'sistema',
    referencia_id BIGINT UNSIGNED NULL,
    lida TINYINT(1) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notificacoes_usuario
      FOREIGN KEY (usuario_id) REFERENCES users(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_notificacoes_usuario_lida (usuario_id, lida, criado_em)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS avaliacoes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_avaliador_id BIGINT UNSIGNED NOT NULL,
    usuario_avaliado_id BIGINT UNSIGNED NULL,
    viagem_id BIGINT UNSIGNED NULL,
    entrega_id BIGINT UNSIGNED NULL,
    pedido_id BIGINT UNSIGNED NULL,
    nota TINYINT UNSIGNED NOT NULL,
    comentario VARCHAR(1000) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_avaliacoes_avaliador
      FOREIGN KEY (usuario_avaliador_id) REFERENCES users(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_avaliacoes_avaliado
      FOREIGN KEY (usuario_avaliado_id) REFERENCES users(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_avaliacoes_viagem
      FOREIGN KEY (viagem_id) REFERENCES viagens(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_avaliacoes_entrega
      FOREIGN KEY (entrega_id) REFERENCES entregas(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_avaliacoes_pedido
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CHECK (nota BETWEEN 1 AND 5),
    KEY idx_avaliacoes_avaliado (usuario_avaliado_id, criado_em)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cupons (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL,
    descricao VARCHAR(255) NULL,
    tipo ENUM('percentual', 'valor_fixo') NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    valor_minimo DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    limite_utilizacoes INT UNSIGNED NULL,
    utilizacoes INT UNSIGNED NOT NULL DEFAULT 0,
    inicio_em DATETIME NOT NULL,
    termina_em DATETIME NOT NULL,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cupons_codigo (codigo),
    KEY idx_cupons_ativo_periodo (ativo, inicio_em, termina_em)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cupons_utilizados (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cupom_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    viagem_id BIGINT UNSIGNED NULL,
    pedido_id BIGINT UNSIGNED NULL,
    valor_desconto DECIMAL(12,2) NOT NULL,
    utilizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cupons_utilizados_cupom
      FOREIGN KEY (cupom_id) REFERENCES cupons(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cupons_utilizados_usuario
      FOREIGN KEY (usuario_id) REFERENCES users(id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cupons_utilizados_viagem
      FOREIGN KEY (viagem_id) REFERENCES viagens(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cupons_utilizados_pedido
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_cupom_utilizado_usuario (usuario_id, utilizado_em)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessoes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    dispositivo VARCHAR(255) NULL,
    plataforma ENUM('android', 'ios', 'web', 'outro') NOT NULL DEFAULT 'outro',
    expira_em DATETIME NOT NULL,
    revogada TINYINT(1) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessoes_usuario
      FOREIGN KEY (usuario_id) REFERENCES users(id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_sessoes_usuario_revogada (usuario_id, revogada),
    KEY idx_sessoes_expira (expira_em)
) ENGINE=InnoDB;

-- ============================================================
-- FIM DO SCHEMA BWÉ GO
-- ============================================================
