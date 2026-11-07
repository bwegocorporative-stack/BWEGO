const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function migrate() {
  let connection;

  try {
    // Conectar ao MySQL sem seleccionar uma database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true,
    });

    const database = process.env.DB_NAME;

    // Criar database automaticamente
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\`
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci`,
    );

    console.log(`Database ${database} criada/verificada!`);

    // Seleccionar database
    await connection.query(`USE \`${database}\``);

    // Localizar migrations
    const migrationsPath = path.join(__dirname, "../migrations");

    const files = fs
      .readdirSync(migrationsPath)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("Nenhum ficheiro SQL encontrado.");
      return;
    }

    // Executar migrations pela ordem dos nomes
    for (const file of files) {
      const filePath = path.join(migrationsPath, file);
      const sql = fs.readFileSync(filePath, "utf8");

      if (!sql.trim()) {
        console.log(`Ficheiro vazio ignorado: ${file}`);
        continue;
      }

      console.log(`A executar: ${file}`);

      await connection.query(sql);

      console.log(`Concluído: ${file}`);
    }

    console.log("\nTodas as migrations foram executadas com sucesso!");
  } catch (error) {
    console.error("\nErro ao executar migrations:", error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
