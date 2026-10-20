import { spawn } from "child_process";
import { loadAndValidateAivenEnv } from "./aiven-preflight";

// 1. Preflight check and environment override
loadAndValidateAivenEnv();

console.log("🚀 Đang khởi động Next.js development server kết nối tới Aiven MySQL...\n");

// 2. Spawn next dev with updated process.env
const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
