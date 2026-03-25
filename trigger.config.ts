import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_contentelevatr",
  runtime: "node",
  logLevel: "info",
  maxDuration: 60,
  dirs: ["src/trigger"],
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
