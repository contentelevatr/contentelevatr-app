import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";
import fs from "fs";
import path from "path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

async function runMigrations() {
  console.log("Applying migrations...");
  
  const migrationFile = path.join(process.cwd(), "drizzle", "0001_smart_shen.sql");
  if (!fs.existsSync(migrationFile)) {
    console.error("Migration file 0001_smart_shen.sql not found.");
    process.exit(1);
  }

  const content = fs.readFileSync(migrationFile, "utf-8");
  const statements = content.split("--> statement-breakpoint");

  for (let statement of statements) {
    const trimmed = statement.trim();
    if (!trimmed) continue;
    
    console.log(`Executing: ${trimmed}`);
    try {
      await sql.unsafe(trimmed);
      console.log("✓ Success");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("⚠ Already exists, skipping.");
      } else {
        console.error("❌ Error:", error.message);
        throw error;
      }
    }
  }

  console.log("\nAll migrations applied successfully.");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
