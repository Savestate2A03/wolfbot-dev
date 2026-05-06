import type { DiscordInteraction, DeferredTaskEvent, ReminderTaskEvent } from "../discord/types.js";

// COMMAND REGISTRY TYPES

export interface LambdaResponse {
    // Generic AWS Lambda Response
    statusCode: number;
    headers?: Record<string, string>;
    body: string;
}

export interface CommandOptionChoice {
    readonly name: string;
    readonly value: string | number;
}

export interface CommandOption {
    readonly name: string;
    readonly description: string;
    readonly type: number;
    readonly required?: boolean;
    readonly options?: readonly CommandOption[];
    readonly choices?: readonly CommandOptionChoice[];
}

export interface CommandDefinition {
    readonly name: string;
    readonly description: string;
    readonly type: number;
    readonly options?: readonly CommandOption[];
}

export interface Command {
    readonly definition: CommandDefinition;
    handle(interaction: DiscordInteraction): Promise<LambdaResponse> | LambdaResponse;
}

export interface DeferredCommand extends Command {
    handleDeferred(event: DeferredTaskEvent): Promise<void>;
}

export interface ReminderCommand extends Command {
    handleReminder(event: ReminderTaskEvent): Promise<void>;
}

// HELPER FUNCTIONS FOR COMMAND REGISTRY

const commands = new Map<string, Command>(); // command list singleton

export function isDeferredCommand(cmd: Command): cmd is DeferredCommand {
    return "handleDeferred" in cmd;
}

export function isReminderCommand(cmd: Command): cmd is ReminderCommand {
    return "handleReminder" in cmd;
}

export function registerCommand(command: Command) {
    commands.set(command.definition.name, command);
}

export function getCommand(name: string): Command | undefined {
    return commands.get(name);
}

export function getAllDefinitions(): CommandDefinition[] {
    return Array.from(commands.values()).map((cmd) => cmd.definition);
}
