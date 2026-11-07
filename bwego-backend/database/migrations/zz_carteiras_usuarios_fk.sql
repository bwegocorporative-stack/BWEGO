SET @carteira_fk_usuarios_exists = (
    SELECT COUNT(*)
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'carteiras'
      AND COLUMN_NAME = 'usuario_id'
      AND REFERENCED_TABLE_NAME = 'usuarios'
      AND CONSTRAINT_NAME = 'fk_carteiras_usuario'
);

SET @drop_carteira_fk = IF(
    @carteira_fk_usuarios_exists = 0 AND EXISTS (
        SELECT 1
        FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'carteiras'
          AND CONSTRAINT_NAME = 'fk_carteiras_usuario'
    ),
    'ALTER TABLE carteiras DROP FOREIGN KEY fk_carteiras_usuario',
    'SELECT 1'
);
PREPARE drop_carteira_fk_stmt FROM @drop_carteira_fk;
EXECUTE drop_carteira_fk_stmt;
DEALLOCATE PREPARE drop_carteira_fk_stmt;

SET @carteira_fk_usuarios_exists = (
    SELECT COUNT(*)
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'carteiras'
      AND COLUMN_NAME = 'usuario_id'
      AND REFERENCED_TABLE_NAME = 'usuarios'
      AND CONSTRAINT_NAME = 'fk_carteiras_usuario'
);

SET @add_carteira_fk = IF(
    @carteira_fk_usuarios_exists = 0,
    'ALTER TABLE carteiras ADD CONSTRAINT fk_carteiras_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1'
);
PREPARE add_carteira_fk_stmt FROM @add_carteira_fk;
EXECUTE add_carteira_fk_stmt;
DEALLOCATE PREPARE add_carteira_fk_stmt;
