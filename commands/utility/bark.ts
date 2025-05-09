import { RepliableInteraction } from 'discord.js';
import { WolfCommand, WolfCommandInterface } from '@commands/command';

/**
 * Basic "Ping/Pong" functionality test.
 * @Class
 */
export class Bark extends WolfCommand implements WolfCommandInterface {
    static readonly _name = 'bark';
    static readonly _description = 'awrruf !!';
    async execute(interaction: RepliableInteraction) {
        await interaction.reply('awrruf!');
    }
    constructor() {
        super(Bark._name, Bark._description);
    }
}
