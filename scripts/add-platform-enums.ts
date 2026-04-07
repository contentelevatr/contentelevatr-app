import postgres from "postgres";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  for (const val of ["facebook", "pinterest", "youtube"]) {
    try {
      await sql.unsafe(`ALTER TYPE platform ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`✅ Added '${val}'`);
    } catch (err: any) {
      console.log(`⚠️  '${val}': ${err.message}`);
    }
  }
  const res = await sql`SELECT unnest(enum_range(NULL::platform)) AS val`;
  console.log("\nAll values:", res.map((r: any) => r.val));
  await sql.end();
}

main().catch(console.error);
