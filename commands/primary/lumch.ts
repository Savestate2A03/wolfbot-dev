import { RepliableInteraction } from 'discord.js';
import { WolfCommand, WolfCommandInterface } from '@commands/command';
import { random_pick_daily } from '@lib/library';

const lumches = [
    "Zaxby's",
    "Dunkin'",
    'McDonalds',
    'Chipotle',
    'Chick-fil-A',
    "Wendy's",
    'Cookout',
    'Bojangles',
    'Waffle House',
    'Taco Bell',
    'Pizza',
    'depression nap',
    'Subway',
    "just vape until you're not hungry",
    "Jimmy John's",
    'drink water',
    'Firehouse',
    'Sheetz',
    'the local mexican joint',
    'cook because poor',
    'Burger King',
    'Chinese'
];

/**
 * Recommends lumch choices based on a list.
 * Kept for legacy reasons ^__^
 * @Class
 */
export class Lumch extends WolfCommand implements WolfCommandInterface {
    static readonly _name = 'lumch';
    static readonly _description = 'foob.';
    async execute(interaction: RepliableInteraction) {
        // Randomly pick a lunch option from the list, per user, per day
        const pick = random_pick_daily(lumches, interaction.user.id);
        await interaction.reply(pick);
    }
    constructor() {
        super(Lumch._name, Lumch._description);
    }
}
