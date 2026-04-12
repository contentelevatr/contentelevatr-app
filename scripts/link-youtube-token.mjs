import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../src/lib/db/index.js";
import { socialAccounts } from "../src/lib/db/schema.js";
import { encrypt } from "../src/lib/platforms/encryption.js";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("--- YouTube Manual Linker ---");
  console.log("Use this to manually link a YouTube account if redirect flows fail.");
  
  const accessToken = await question("Access Token: ");
  const refreshToken = await question("Refresh Token (optional): ");
  
  if (!accessToken) {
    console.log("Aborted.");
    process.exit(0);
  }

  try {
    console.log("Fetching YouTube channel info...");
    const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Invalid token: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    if (!json.items || json.items.length === 0) {
      throw new Error("No YouTube channel found for this token.");
    }

    const channel = json.items[0];
    console.log(`Authenticated as Channel: ${channel.snippet.title} (${channel.id})`);

    // Find the first workspace
    const workspace = await db.query.workspaces.findFirst();
    if (!workspace) {
      throw new Error("No workspace found. Please sign in to the app first.");
    }
    console.log(`Linking to workspace: ${workspace.name}`);

    // Encrypt and Save
    const accessTokenEnc = encrypt(accessToken);
    const refreshTokenEnc = refreshToken ? encrypt(refreshToken) : null;

    await db.insert(socialAccounts).values({
      workspaceId: workspace.id,
      platform: "youtube",
      platformAccountId: channel.id,
      accountName: channel.snippet.title,
      accountAvatar: channel.snippet.thumbnails.default.url,
      accessTokenEnc,
      refreshTokenEnc,
    }).onConflictDoUpdate({
      target: [socialAccounts.workspaceId, socialAccounts.platform, socialAccounts.platformAccountId],
      set: {
        accountName: channel.snippet.title,
        accountAvatar: channel.snippet.thumbnails.default.url,
        accessTokenEnc,
        refreshTokenEnc,
        updatedAt: new Date(),
      }
    });

    console.log("\n✅ Success! YouTube account linked successfully.");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  } finally {
    rl.close();
  }
}

main();
