import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// grab environmental variables from .env file
const env = Object.fromEntries(
    readFileSync(".env", "utf-8")
        .split("\n")
        .filter((line) => line.includes("=") && !line.startsWith("#"))
        .map((line) => {
            const i = line.indexOf("=");
            return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
        }),
);

const GUIDED: boolean = process.argv
    .slice(2)
    .map((arg: string) => arg.toLowerCase().trim())
    .includes("--guided");

// Sanity checks
const required = ["DISCORD_PUBLIC_KEY", "DISCORD_APPLICATION_ID", "DISCORD_BOT_TOKEN"];

for (const key of required) {
    if (!env[key]) {
        console.error(`are u stupid. MISSING ${key} IN YOUR .env !!!!!!`);
        process.exit(1);
    }
}

// Construct overrides
const overrides = [
    `DiscordPublicKey="${env.DISCORD_PUBLIC_KEY}"`,
    `DiscordApplicationId="${env.DISCORD_APPLICATION_ID}"`,
    `DiscordBotToken="${env.DISCORD_BOT_TOKEN}"`,
].join(" ");

console.log("epic sauce time ... (building and deploying)");
execSync(
    `sam build && sam deploy --parameter-overrides ${overrides} --stack-name sidebot-dev ${GUIDED ? "--guided" : ""}`,
    {
        stdio: "inherit",
    },
);
