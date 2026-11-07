SET @localizacao_motorista_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'motoristas'
      AND COLUMN_NAME = 'localizacao_atualizada_em'
);

SET @add_localizacao_motorista_column = IF(
    @localizacao_motorista_column_exists = 0,
    'ALTER TABLE motoristas ADD COLUMN localizacao_atualizada_em TIMESTAMP NULL DEFAULT NULL AFTER longitude',
    'SELECT 1'
);
PREPARE add_localizacao_motorista_column_stmt FROM @add_localizacao_motorista_column;
EXECUTE add_localizacao_motorista_column_stmt;
DEALLOCATE PREPARE add_localizacao_motorista_column_stmt;
