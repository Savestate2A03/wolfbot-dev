import { readFileSync } from "node:fs";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { CommandDefinition, getAllDefinitions } from "../src/commands/registry.js";
import "../src/commands/src/index.js";

// She was forced to add proxy support due to her workplace environment. This is so sad.
const proxy: string | undefined = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxy) setGlobalDispatcher(new ProxyAgent(proxy));

// Read .env file
const env = Object.fromEntries(
    readFileSync(".env", "utf-8")
        .split("\n")
        .filter((line) => line.includes("=") && !line.startsWith("#"))
        .map((line) => {
            const i = line.indexOf("=");
            return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
        }),
);

// Grab necessary variables
const token = env.DISCORD_BOT_TOKEN;
const appId = env.DISCORD_APPLICATION_ID;
const guildId = env.DISCORD_GUILD_ID;

// Run registry compilation function
const commands: CommandDefinition[] = getAllDefinitions();

// If no guild is provided, register commands globally (takes abt an hour to register)
// Normally u will have a test server u reg commands to at first and when ur ready
// to add the bot to other servers then u do the global reg.
const url = guildId
    ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${appId}/commands`;


const response: Response = await fetch(url, {
    method: "PUT",
    headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
});

if (!response.ok) {
    console.error(`HELLO??? : ${response.status}`, await response.text());
    process.exit(1);
}

const data = await response.json();
console.log(`yippee !!! ${(data as unknown[]).length} commands r now regged${guildId ? ` in guild ${guildId}` : " globally"} ^__^ `);
