// ENUMS

import { Nullable, Optional } from "../lib/types";

export const InteractionType = {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
    APPLICATION_COMMAND_AUTOCOMPLETE: 4,
    MODAL_SUBMIT: 5,
} as const;

export const InteractionResponseType = {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
    DEFERRED_UPDATE_MESSAGE: 6,
    UPDATE_MESSAGE: 7,
} as const;

export const ApplicationCommandType = {
    CHAT_INPUT: 1,
    USER: 2,
    MESSAGE: 3,
    PRIMARY_ENTRY_POINT: 4,
} as const;

export const ApplicationCommandOptionType = {
    SUB_COMMAND: 1,
    SUB_COMMAND_GROUP: 2,
    STRING: 3,
    INTEGER: 4,
    BOOLEAN: 5,
    USER: 6,
    CHANNEL: 7,
    ROLE: 8,
    MENTIONABLE: 9,
    NUMBER: 10,
    ATTACHMENT: 11,
} as const;

// DISCORD TYPES

export interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    global_name: string | null;
    avatar: string | null;
}

export interface DiscordInteractionOption {
    name: string;
    type: number;
    value?: string | number | boolean;
    options?: DiscordInteractionOption[];
}

export interface DiscordInteractionData {
    id: string;
    name: string;
    type: number;
    options?: DiscordInteractionOption[];
}

export interface DiscordInteraction {
    id: string;
    type: number;
    application_id: string;
    token: string;
    data?: DiscordInteractionData;
    guild_id?: string;
    channel_id?: string;
    member?: {
        user: DiscordUser;
        nick: string | null;
    };
    user?: DiscordUser;
}

// INTERNAL TYPES

export type DeferredTaskExtras = Record<string, string | number | boolean>;

export type DeferredTaskOptions = {
    [key: string]: string | number | boolean | DeferredTaskExtras | undefined;
    EXTRAS?: DeferredTaskExtras;
};

export interface DeferredTaskEvent {
    deferredTask: true;
    interactionToken: string;
    applicationId: string;
    userId: string;
    command: string;
    subcommand: string;
    options: DeferredTaskOptions;
}

export interface ReminderTaskEvent {
    reminderTask: true;
    command: string;
    guildId: string;
    uuid: string;
}

export interface DiscordSubCommand {
    subcommand: string;
    options: Map<string, string | number | boolean>;
}

// TYPE-BASED HELPER FUNCTIONS

export function getSubcommand(data: DiscordInteractionData): DiscordSubCommand {
    const subCommand: DiscordInteractionOption | undefined = data.options?.[0];
    if (!subCommand || subCommand.type !== ApplicationCommandOptionType.SUB_COMMAND) {
        throw new Error(
            subCommand
                ? `omfg. ok lol this is NOT what i thought it was. lol. ${subCommand.type}`
                : "WHAT IS THIS ACTUALLY THOUGH",
        );
    }
    const options = new Map<string, string | number | boolean>();
    for (const option of subCommand.options ?? []) {
        if (option.value !== undefined) options.set(option.name, option.value);
    }
    return { subcommand: subCommand.name, options };
}

export function getUser(interaction: DiscordInteraction): DiscordUser {
    const user = interaction.member?.user ?? interaction.user;
    if (!user) throw new Error("no interaction user ?? A GHOST??? WHAT");
    return user;
}

export function getNick(interaction: DiscordInteraction): Optional<string> {
    const nick = interaction.member?.nick ?? undefined;
    return nick;
}

// ENUM TYPEOFS

export type ApplicationCommandOptionTypeEnum = typeof ApplicationCommandOptionType;
