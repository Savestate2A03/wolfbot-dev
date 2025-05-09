import {
    InteractionReplyOptions,
    RepliableInteraction,
    SlashCommandBuilder
} from 'discord.js';

interface WolfCommandBase {
    getName(): string;
    getDescription(): string;
    getCommand(): SlashCommandBuilder;
}

/**
 * Basic expected command functionality scaffolding. Commands
 * are expected to follow this, along with the base it extends.
 * @interface
 */
export interface WolfCommandInterface extends WolfCommandBase {
    execute(
        interaction: RepliableInteraction,
        options?: InteractionReplyOptions
    ): Promise<void>;
}

export class WolfCommand implements WolfCommandBase {
    private command: SlashCommandBuilder;
    private name: string;
    private description: string;

    public getName(): string {
        return this.name;
    }

    public getDescription(): string {
        return this.description;
    }

    public getCommand(): SlashCommandBuilder {
        return this.command;
    }

    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
        this.command = new SlashCommandBuilder()
            .setName(name)
            .setDescription(description);
    }
}
