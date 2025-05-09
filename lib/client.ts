import { Client, ClientOptions } from 'discord.js';
import { WolfCommandInterface } from '@commands/command';
import { WolfDatabase } from './database';

type WolfCommandDictionary = Record<string, WolfCommandInterface>;

export class WolfClient extends Client<boolean> {
    private commands: WolfCommandDictionary;
    private database: WolfDatabase;

    /**
     * Get a reference to the JSON database.
     * @returns {WolfDatabase} - The JSON database.
     */
    public db(): WolfDatabase {
        return this.database;
    }

    /**
     * Adds a command, keyed by name, to our command array.
     * @param {WolfCommandInterface} command - The command to keep track of.
     */
    public add(command: WolfCommandInterface): void {
        this.commands[command.getName()] = command;
    }

    /**
     * Gets a command by name.
     * @returns {WolfCommandInterface | null} - The command if it exists, otherwise null.
     */
    public get(name: string): WolfCommandInterface | null {
        return name in this.commands ? this.commands[name] : null;
    }

    /**
     * Creates an instance of our client, which extends Client<boolean>
     * @param {ClientOptions} options - Options to pass to the super constructor.
     * @constructor
     */
    constructor(options: ClientOptions) {
        super(options);
        this.database = new WolfDatabase();
        this.commands = {};
    }
}
