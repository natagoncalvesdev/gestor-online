import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function pgConfig() {
  const envPath = path.join(root, ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  let raw = "";
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("DATABASE_URL=")) {
      raw = line.slice("DATABASE_URL=".length).trim();
      break;
    }
  }
  if (!raw) throw new Error("DATABASE_URL não encontrado em .env.local");

  const prefix = "postgresql://";
  if (!raw.startsWith(prefix)) {
    return { connectionString: raw, ssl: { rejectUnauthorized: false } };
  }

  const rest = raw.slice(prefix.length);
  const at = rest.lastIndexOf("@");
  if (at < 0) return { connectionString: raw, ssl: { rejectUnauthorized: false } };

  const userPass = rest.slice(0, at);
  const hostDb = rest.slice(at + 1);
  const colonUser = userPass.indexOf(":");
  const slash = hostDb.indexOf("/");
  const hostPort = slash >= 0 ? hostDb.slice(0, slash) : hostDb;
  const database = slash >= 0 ? hostDb.slice(slash + 1) : "postgres";
  const colonPort = hostPort.lastIndexOf(":");

  return {
    user: userPass.slice(0, colonUser),
    password: userPass.slice(colonUser + 1),
    host: colonPort >= 0 ? hostPort.slice(0, colonPort) : hostPort,
    port: colonPort >= 0 ? Number(hostPort.slice(colonPort + 1)) : 5432,
    database,
    ssl: { rejectUnauthorized: false },
  };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Uso: node scripts/apply-sql-files.mjs <arquivo.sql> ...");
  process.exit(1);
}

const client = new pg.Client(pgConfig());

await client.connect();
try {
  for (const rel of files) {
    const file = path.isAbsolute(rel) ? rel : path.join(root, rel);
    const sql = fs.readFileSync(file, "utf8");
    console.log(`Aplicando ${path.basename(file)}...`);
    await client.query(sql);
    console.log("OK");
  }
} finally {
  await client.end();
}