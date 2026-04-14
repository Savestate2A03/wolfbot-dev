import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Grab environmental variables from .env file
const env = Object.fromEntries(
    readFileSync(".env", "utf-8")
        .split("\n")
        .filter((line) => line.includes("=") && !line.startsWith("#"))
        .map((line) => {
            const i = line.indexOf("=");
            return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
        }),
);

// Sanity checks
const required = ["DISCORD_PUBLIC_KEY", "DISCORD_APPLICATION_ID", "GOOGLE_MAPS_API_KEY"];

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
    `GoogleMapsApiKey="${env.GOOGLE_MAPS_API_KEY}"`,
].join(" ");

console.log("epic sauce time ... (building and deploying)");
execSync(`sam build && sam deploy --parameter-overrides ${overrides}`, {
    stdio: "inherit",
});
