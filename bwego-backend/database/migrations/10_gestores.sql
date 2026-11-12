CREATE TABLE IF NOT EXISTS gestores (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(25) NOT NULL,
    email VARCHAR(190) NOT NULL,
    funcao VARCHAR(120) NOT NULL,
    foto_url VARCHAR(500) NOT NULL,
    foto_public_id VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login DATETIME NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_gestores_email (email),
    UNIQUE KEY uq_gestores_telefone (telefone),
    KEY idx_gestores_ativo (ativo),
    CONSTRAINT chk_gestores_nome
        CHECK (CHAR_LENGTH(TRIM(nome)) >= 2),
    CONSTRAINT chk_gestores_funcao
        CHECK (CHAR_LENGTH(TRIM(funcao)) >= 2)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
