import { message, deferred } from "../../discord/respond.js";
import { patchOriginalResponse } from "../../discord/api.js";
import {
    ApplicationCommandOptionType,
    ApplicationCommandOptionTypeEnum,
    ApplicationCommandType,
    DeferredTaskEvent,
    DiscordInteraction,
    DiscordUser,
    getSubcommand,
    getUser,
} from "../../discord/types.js";
import { getData, putData } from "../../lib/db.js";
import { invokeDeferredTask } from "../../lib/invoke.js";
import { registerCommand } from "../registry.js";
import type { DeferredCommand } from "../registry.js";
import { Nullable, Optional } from "../../lib/types.js";

// TODO: scheduled lambda / EventBridge rule that scans every guild's syncwatches and pings `joined` users N minutes before `when`

const SYNCWATCH_PK: string = "SYNCWATCH_DB";

// INTERFACES

interface SyncwatchItem {
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

// per-guild primary key
async function dbLoad(guildId: string): Promise<SyncwatchDB> {
    const result = await getData<SyncwatchDB>({ pk: SYNCWATCH_PK, sk: guildId, id: null });
    return result?.data ?? { syncwatches: [] };
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
    return { channel_id, guild_id, user };
}

const definition = {
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
} as const;

// TYPES

type Definition = typeof definition;
type SubcommandDef = Definition["options"][number];
type SubcommandName = SubcommandDef["name"];

// Pull the options array (if any) out of a given subcommand
type OptionsArray<T extends SubcommandName> =
    Extract<SubcommandDef, { name: T }> extends { options: readonly (infer O)[] } ? O : never;

// Just the names (what you originally asked for)
type OptionNames<T extends SubcommandName> = OptionsArray<T> extends { name: infer N } ? N : never;

// Object shape, respecting `required`
type Options<T extends SubcommandName> = {
    [K in Extract<OptionsArray<T>, { required: true }> as K extends { name: infer N extends string }
        ? N
        : never]: string;
} & {
    [K in Exclude<OptionsArray<T>, { required: true }> as K extends { name: infer N extends string }
        ? N
        : never]?: string;
};

const opts = <T extends SubcommandName>(_subcommand: T, options: unknown): Options<T> => options as Options<T>;

// COMMAND

const syncwatch: DeferredCommand = {
    definition,
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
                const lines = upcoming.map((s) => `• **${s.title}** — <@${s.host}> (${s.joined.length} joined)`);
                return message(lines.join("\n"));

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
        const guildId = options.EXTRAS?.guild_id as Optional<string>;
        const channelId = options.EXTRAS?.channel_id as Optional<string>;

        try {
            if (!guildId || !channelId) {
                await patchOriginalResponse(applicationId, interactionToken, "lost the server context somehow LOL");
                return;
            }

            const db = await dbLoad(guildId);
            const view = buildView(db, userId);

            if (subcommand === "host") {
                const { title, when } = opts(subcommand, options);
                // TODO:
                //   - parse `options.when` (string) into epoch ms — chrono-node or similar
                //   - reject if in the past / too far out
                //   - push new SyncwatchItem onto db.syncwatches with createdAt=Date.now(),
                //     host=userId, channel=channelId, joined=[userId]
                //   - saveDB(guildId, db)
                await patchOriginalResponse(applicationId, interactionToken, "todo: actually host the syncwatch");
                return;
            }

            if (subcommand === "unhost") {
                const { title } = opts(subcommand, options);
                // TODO:
                //   - target = pick from view.hostedByUser by `options.title`,
                //     fall back to view.mostRecentHosted
                //   - if none → "u dont host anything LOL"
                //   - splice out of db.syncwatches; saveDB
                await patchOriginalResponse(applicationId, interactionToken, "todo: actually unhost");
                return;
            }

            if (subcommand === "join") {
                const { title } = opts(subcommand, options);
                // TODO:
                //   - target = pick from view.all by `options.title`,
                //     fall back to view.mostRecentOverall
                //   - if none → "nothing to join lol"
                //   - if userId already in target.joined → idempotent ack
                //   - else push userId; saveDB
                await patchOriginalResponse(applicationId, interactionToken, "todo: actually join");
                return;
            }

            if (subcommand === "leave") {
                const { title } = opts(subcommand, options);
                // TODO:
                //   - target = pick from view.joinedByUser by `options.title`,
                //     fall back to view.mostRecentJoined
                //   - if none → "u arent in any of these lol"
                //   - filter userId out of target.joined; saveDB
                await patchOriginalResponse(applicationId, interactionToken, "todo: actually leave");
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
};

registerCommand(syncwatch);
