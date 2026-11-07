-- BWÉ GO | usuario.sql
-- Módulo de utilizadores: clientes, motoristas, administradores e parceiros.
-- Compatível com MySQL 8.0+
-- Execute este ficheiro na sua instância MySQL.

CREATE DATABASE IF NOT EXISTS bwego
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bwego;

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(190) NULL,
    telefone VARCHAR(25) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,

    tipo ENUM('cliente', 'motorista', 'admin', 'parceiro')
        NOT NULL DEFAULT 'cliente',

    foto_url VARCHAR(500) NULL,
    foto_public_id VARCHAR(255) NULL,

    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    telefone_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    ultimo_login DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email (email),
    UNIQUE KEY uq_usuarios_telefone (telefone),
    KEY idx_usuarios_tipo (tipo),
    KEY idx_usuarios_ativo (ativo),
    KEY idx_usuarios_criado_em (criado_em),

    CONSTRAINT chk_usuarios_nome
        CHECK (CHAR_LENGTH(TRIM(nome)) >= 2),
    CONSTRAINT chk_usuarios_telefone
        CHECK (CHAR_LENGTH(TRIM(telefone)) >= 9)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Endereços guardados pelo utilizador (casa, trabalho ou outros).
CREATE TABLE IF NOT EXISTS enderecos_usuarios (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT UNSIGNED NOT NULL,
    etiqueta VARCHAR(50) NOT NULL DEFAULT 'Outro',
    destinatario VARCHAR(150) NULL,
    telefone_destinatario VARCHAR(25) NULL,

    endereco VARCHAR(255) NOT NULL,
    referencia VARCHAR(255) NULL,
    municipio VARCHAR(100) NULL,
    provincia VARCHAR(100) NULL,

    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    principal BOOLEAN NOT NULL DEFAULT FALSE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_enderecos_usuario (usuario_id),
    KEY idx_enderecos_principal (usuario_id, principal),

    CONSTRAINT fk_enderecos_usuarios_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_enderecos_latitude
        CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
    CONSTRAINT chk_enderecos_longitude
        CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- Nota de segurança:
-- Guarde somente hashes de senha (bcrypt/Argon2), nunca senhas em texto puro.
-- Não inclua credenciais reais neste ficheiro SQL.
