import { randomUUID } from "node:crypto";
import { message, deferred } from "../../discord/respond.js";
import { patchOriginalResponse, postChannelMessage } from "../../discord/api.js";
import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    DeferredTaskEvent,
    DiscordInteraction,
    DiscordUser,
    ReminderTaskEvent,
    getNick,
    getSubcommand,
    getUser,
} from "../../discord/types.js";
import { getData, putData } from "../../lib/db.js";
import { invokeDeferredTask } from "../../lib/invoke.js";
import { createReminder, deleteReminder } from "../../lib/schedule.js";
import { registerCommand } from "../registry.js";
import type { DeferredCommand, ReminderCommand } from "../registry.js";
import { Nullable, Optional } from "../../lib/types.js";
import { parseToZone } from "../../lib/time.js";

const HOW_LONG_BEFORE_REMIND = 5 * 60 * 1000; // 5 minutes

const SYNCWATCH_PK: string = "SYNCWATCH_DB";

// INTERFACES

interface SyncwatchItem {
    id: string;
    title: string;
    when: ReturnType<Date["valueOf"]>;
    createdAt: ReturnType<Date["valueOf"]>;
    host: DiscordUser["id"];
    channel: string;
    joined: DiscordUser["id"][];
}

interface SyncwatchDB {
    syncwatches: SyncwatchItem[];
}

interface Context {
    channel_id: string;
    guild_id: string;
    user: DiscordUser;
    nick?: string;
}

interface SyncwatchView {
    all: SyncwatchItem[];
    hostedByUser: SyncwatchItem[];
    joinedByUser: SyncwatchItem[];
    mostRecentOverall: SyncwatchItem | null;
    mostRecentHosted: SyncwatchItem | null;
    mostRecentJoined: SyncwatchItem | null;
}

// HELPERS

const newer = (a: SyncwatchItem, b: SyncwatchItem): SyncwatchItem => (b.createdAt > a.createdAt ? b : a);
const mostRecent = (items: SyncwatchItem[]): SyncwatchItem | null => (items.length === 0 ? null : items.reduce(newer));
const isHostedBy = (item: SyncwatchItem, userId: DiscordUser["id"]): boolean => item.host === userId;
const isJoinedBy = (item: SyncwatchItem, userId: DiscordUser["id"]): boolean => item.joined.includes(userId);

function buildView(db: SyncwatchDB, userId: DiscordUser["id"]): SyncwatchView {
    const all = db.syncwatches;
    const hostedByUser = all.filter((i) => isHostedBy(i, userId));
    const joinedByUser = all.filter((i) => isJoinedBy(i, userId));
    return {
        all,
        hostedByUser,
        joinedByUser,
        mostRecentOverall: mostRecent(all),
        mostRecentHosted: mostRecent(hostedByUser),
        mostRecentJoined: mostRecent(joinedByUser),
    };
}

// DATABASE

async function dbLoad(guildId: string): Promise<SyncwatchDB> {
    // per-guild primary key
    const result = await getData<SyncwatchDB>({ pk: SYNCWATCH_PK, sk: guildId, id: null });
    const db = result?.data ?? { syncwatches: [] };
    for (const item of db.syncwatches) {
        if (!item.id) item.id = randomUUID();
    }
    return db;
}

async function dbSave(guildId: string, db: SyncwatchDB): Promise<void> {
    await putData<SyncwatchDB>({ pk: SYNCWATCH_PK, sk: guildId, id: null }, { data: db });
}

// syncwatches must be guild-scoped
function getContext(interaction: DiscordInteraction): Context | null {
    const { channel_id, guild_id } = interaction;
    if (!channel_id || !guild_id) return null;
    let user: DiscordUser;
    try {
        user = getUser(interaction);
    } catch {
        return null;
    }
    return { channel_id, guild_id, user, nick: getNick(interaction) };
}

// COMMAND

const syncwatch: DeferredCommand & ReminderCommand = {
    definition: {
        name: "syncwatch",
        description: "Watch together!",
        type: ApplicationCommandType.CHAT_INPUT,
        options: [
            {
                name: "host",
                description: "Plan a syncwatch!",
                type: ApplicationCommandOptionType.SUB_COMMAND,
                options: [
                    {
                        name: "title",
                        description: "What!",
                        type: ApplicationCommandOptionType.STRING,
                        required: true,
                    },
                    {
                        name: "when",
                        description: 'When? (ex. "tonight at 8:30pm")',
                        type: ApplicationCommandOptionType.STRING,
                        required: true,
                    },
                    {
                        name: "timezone",
                        description: "Where? (Defaults to Pacific)",
                        type: ApplicationCommandOptionType.STRING,
                        required: false,
                        choices: [
                            { name: "Pacific Time", value: "US/Pacific" },
                            { name: "Mountain Time", value: "US/Mountain" },
                            { name: "Central Time", value: "US/Central" },
                            { name: "Eastern Time", value: "US/Eastern" },
                            { name: "Central European Time", value: "Europe/Berlin" },
                        ],
                    },
                ],
            },
            {
                name: "unhost",
                description: "Unhost your syncwatch",
                type: ApplicationCommandOptionType.SUB_COMMAND,
                options: [
                    {
                        name: "title",
                        description: "(Specify if not the most recent one)",
                        type: ApplicationCommandOptionType.STRING,
                        required: false,
                    },
                ],
            },
            {
                name: "list",
                description: "List currently scheduled syncwatches!",
                type: ApplicationCommandOptionType.SUB_COMMAND,
            },
            {
                name: "join",
                description: "Get notified!",
                type: ApplicationCommandOptionType.SUB_COMMAND,
                options: [
                    {
                        name: "title",
                        description: "(Specify if not the most recent one)",
                        type: ApplicationCommandOptionType.STRING,
                        required: false,
                    },
                ],
            },
            {
                name: "leave",
                description: "Opt-out of a syncwatch",
                type: ApplicationCommandOptionType.SUB_COMMAND,
                options: [
                    {
                        name: "title",
                        description: "(Specify if not the most recent one)",
                        type: ApplicationCommandOptionType.STRING,
                        required: false,
                    },
                ],
            },
        ],
    },
    handle: async (interaction) => {
        const ctx: Nullable<Context> = getContext(interaction);

        if (!ctx) {
            return message("uhh this only works in a serverrrr . sorryyy lol");
        }

        const { subcommand, options } = getSubcommand(interaction.data!);

        switch (subcommand) {
            case "list":
                const db = await dbLoad(ctx.guild_id);
                const now = Date.now();
                const upcoming = db.syncwatches
                    .filter((s) => s.when > now) // TODO: delete entries when running this also?
                    .sort((a, b) => a.when - b.when);

                if (upcoming.length === 0) {
                    return message("no syncwatches scheduled rn . get on it loser !!!");
                }

                // TODO: better formatting (relative time strings, bullets, who's joined, etc)
                const lines = upcoming.map((item) => `- **${item.title}** at <t:${item.when / 1000}:f>, hosted by <@${item.host}> (${item.joined.length} joined)`);
                return message(['## UPCOMING SYNCWATCHES !!', ...lines].join("\n"));

            case "host":
            case "unhost":
            case "join":
            case "leave":
            default:
                const event: DeferredTaskEvent = {
                    deferredTask: true,
                    interactionToken: interaction.token,
                    applicationId: interaction.application_id,
                    userId: ctx.user.id,
                    command: "syncwatch",
                    subcommand,
                    options: {
                        ...Object.fromEntries(options),
                        EXTRAS: {
                            guild_id: ctx.guild_id,
                            channel_id: ctx.channel_id,
                            username: ctx.user.username,
                        },
                    },
                };
                try {
                    await invokeDeferredTask(event);
                } catch (err) {
                    console.error("syncwatch defer DIED x_x", err);
                    return message("ok so like i exploded trying to defer that. ur fault probably");
                }
                return deferred();
        }
    },
    handleDeferred: async (event) => {
        const { applicationId, interactionToken, userId, subcommand, options } = event;
        const guild = options.EXTRAS?.guild_id as Optional<string>;
        const channel = options.EXTRAS?.channel_id as Optional<string>;
        const username = options.EXTRAS?.username as Optional<string>;

        try {
            if (!guild || !channel) {
                await patchOriginalResponse(applicationId, interactionToken, "lost the server context somehow LOL");
                return;
            }

            const db = await dbLoad(guild);
            const view = buildView(db, userId);

            if (subcommand === "host") {
                const title = options.title as string;
                const when = options.when as string;
                const timezone = (options.timezone as Optional<string>) ?? "US/Pacific";
                const now = Date.now();

                if (view.hostedByUser.length !== 0) {
                    await patchOriginalResponse(applicationId, interactionToken, "no !!! ALREADY HOSTING");
                    return;
                }

                const parsed = parseToZone(when, timezone);
                if (!parsed) {
                    await patchOriginalResponse(applicationId, interactionToken, "ur date kinda fucky . . .?");
                    return;
                }

                if (parsed.valueOf() < now) {
                    await patchOriginalResponse(applicationId, interactionToken, "NOT THE FUTURE???");
                    return;
                }

                const id = randomUUID();
                db.syncwatches.push({
                    id,
                    channel,
                    createdAt: now,
                    host: userId,
                    joined: [userId],
                    title,
                    when: parsed.valueOf(),
                });

                await dbSave(guild, db);

                try {
                    await createReminder(guild, id, parsed.valueOf() - HOW_LONG_BEFORE_REMIND, {
                        reminderTask: true,
                        command: "syncwatch",
                        guildId: guild,
                        uuid: id,
                    });
                } catch (err) {
                    console.error("REMINDER failed", err);
                }

                await patchOriginalResponse(
                    applicationId,
                    interactionToken,
                    `## SyNCh0st!\nWHAT: '**${title}**'\nWHEN: <t:${parsed.getTime() / 1000}:f>\n(hosted by <@${userId}>) ^_^\n\nRun \`/syncwatch\` \`join\` to get NOTIFIED!`,
                );
                return;
            }

            if (subcommand === "unhost") {
                if (view.hostedByUser.length === 0) {
                    await patchOriginalResponse(applicationId, interactionToken, "idio.t god. FUCK");
                    return;
                }

                const title = options.title as Optional<string>;
                const index = db.syncwatches.findIndex(
                    (item) =>
                        item.host === userId && (title ? item.title.toLowerCase().includes(title.toLowerCase()) : true),
                );

                if (index < 0) {
                    await patchOriginalResponse(applicationId, interactionToken, "literally no idea.");
                    return;
                }

                const removed = db.syncwatches[index];
                db.syncwatches.splice(index, 1);

                await dbSave(guild, db);

                try {
                    await deleteReminder(guild, removed.id);
                } catch (err) {
                    console.error("DELETE REMINDER failed", err);
                }

                await patchOriginalResponse(applicationId, interactionToken, "AAAND ITS OUTTA HEREEEEE");
                return;
            }

            if (subcommand === "join") {
                const title = options.title as Optional<string>;

                if (!view.mostRecentOverall) {
                    await patchOriginalResponse(applicationId, interactionToken, "no one iis hosting ;;_; oomfg");
                    return;
                }
                const watch = title
                    ? db.syncwatches.find((item) => item.title.toLowerCase().includes(title.toLowerCase()))
                    : view.mostRecentOverall;

                if (!watch) {
                    await patchOriginalResponse(
                        applicationId,
                        interactionToken,
                        "i promisei tried to find it but i couldnt.....",
                    );
                    return;
                }

                if (watch.joined.includes(userId)) {
                    await patchOriginalResponse(applicationId, interactionToken, "UR ALREADY IN :DD//");
                    return;
                }

                watch.joined.push(userId);
                await dbSave(guild, db);

                await patchOriginalResponse(applicationId, interactionToken, "UR IN THERE !!!! :D//");
                return;
            }

            if (subcommand === "leave") {
                const title = options.title as Optional<string>;

                if (view.joinedByUser.length === 0) {
                    await patchOriginalResponse(applicationId, interactionToken, "what. are oyu even tryign to LEAVE?");
                    return;
                }

                if (title) {
                    const joined = view.joinedByUser.find((item) =>
                        item.title.toLowerCase().includes(title.toLowerCase()),
                    );
                    if (!joined) {
                        await patchOriginalResponse(
                            applicationId,
                            interactionToken,
                            ":rolling_eyes: what are u even searching for",
                        );
                        return;
                    }
                    joined.joined.splice(joined.joined.indexOf(userId));
                    await dbSave(guild, db);
                    await patchOriginalResponse(applicationId, interactionToken, "ok ur off :3");
                    return;
                }

                view.mostRecentJoined?.joined.splice(view.mostRecentJoined.joined.indexOf(userId));

                await dbSave(guild, db);
                await patchOriginalResponse(applicationId, interactionToken, "ok ur off :3");
                return;
            }

            await patchOriginalResponse(applicationId, interactionToken, "i don't know what u want from me dude");
        } catch (err) {
            console.error("EPIC SYNCWATCH FAIL", err);
            await patchOriginalResponse(
                applicationId,
                interactionToken,
                "epic syncwatch failure ... lol . actually wait. wtf WHY did that happen????",
            );
        }
    },
    handleReminder: async (event) => {
        const { guildId, uuid: id } = event;
        const db = await dbLoad(guildId);
        const watch = db.syncwatches.find((item) => item.id === id);
        if (!watch) {
            console.warn("reminder fired but watch gone", guildId, id);
            return;
        }
        const mentions = watch.joined.filter(id => id !== watch.host).map((id) => `<@${id}>`).join(" ");
        const timestamp = Math.floor(watch.when / 1000);
        const content = `## SYNCWATCH STARTING SOON !!! :3\n**${watch.title}**\nhost: <@${watch.host}>\nGET OVER HERE LOSERS: ${mentions}`;
        try {
            await postChannelMessage(watch.channel, content, watch.joined);
        } catch (err) {
            console.error("reminder post failed", err);
        }
    },
};

registerCommand(syncwatch);
