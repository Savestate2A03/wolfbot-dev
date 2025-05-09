import { RepliableInteraction } from 'discord.js';
import { WolfCommand, WolfCommandInterface } from '@commands/command';

/**
 * Returns the source code repository
 * @Class
 */
export class Source extends WolfCommand implements WolfCommandInterface {
    static readonly _name = 'source';
    static readonly _description = 'teh codez :3';
    async execute(interaction: RepliableInteraction) {
        await interaction.reply(
            'yipeeeee \\<3 <https://github.com/Savestate2A03/wolfbot-dev>'
        );
    }
    constructor() {
        super(Source._name, Source._description);
    }
}
