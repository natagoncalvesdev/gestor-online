import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Uso: node scripts/apply-sql.mjs <caminho.sql>");
  process.exit(1);
}

const raiz = resolve(import.meta.dirname, "..");
const envLocal = readFileSync(resolve(raiz, ".env.local"), "utf8");
const linhaUrl = envLocal.split("\n").find((linha) => linha.startsWith("DATABASE_URL="));
if (!linhaUrl) process.exit(1);

function normalizarDatabaseUrl(valor) {
  const bruto = valor.trim();
  const match = bruto.match(/^postgresql:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return bruto;
  return `postgresql://${match[1]}:${encodeURIComponent(decodeURIComponent(match[2]))}@${match[3]}`;
}

const sql = readFileSync(resolve(raiz, arquivo), "utf8");
const client = new pg.Client({
  connectionString: normalizarDatabaseUrl(linhaUrl.slice("DATABASE_URL=".length)),
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query("begin");
try {
  await client.query(sql);
  await client.query("commit");
  console.log(`Aplicado: ${arquivo}`);
} catch (erro) {
  await client.query("rollback");
  console.error(erro);
  process.exit(1);
} finally {
  await client.end();
}