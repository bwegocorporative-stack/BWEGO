SET @viagens_categoria_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'viagens'
      AND COLUMN_NAME = 'categoria'
);

SET @add_viagens_categoria = IF(
    @viagens_categoria_exists = 0,
    'ALTER TABLE viagens ADD COLUMN categoria ENUM(''economico'', ''conforto'', ''premium'', ''moto'') NOT NULL DEFAULT ''economico'' AFTER tipo_viagem',
    'SELECT 1'
);
PREPARE add_viagens_categoria_stmt FROM @add_viagens_categoria;
EXECUTE add_viagens_categoria_stmt;
DEALLOCATE PREPARE add_viagens_categoria_stmt;
