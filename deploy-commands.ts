import { REST, Routes } from 'discord.js';

import { Bark } from '@commands/utility/bark';
import { Lumch } from '@commands/primary/lumch';
import { Lunch } from '@commands/primary/lunch';
import config from '@config' with { type: 'json' };
import { Source } from '@commands/utility/source';

const commands = [
    // Remember to also add to main.ts!
    new Bark().getCommand().toJSON(),
    new Lumch().getCommand().toJSON(),
    new Lunch().getCommand().toJSON(),
    new Source().getCommand().toJSON()
];
// Grab all the command folders from the commands directory you created earlier

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// and deploy your commands!
void (async () => {
    try {
        console.log(
            `Started refreshing ${commands.length} application (/) commands.`
        );

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = (await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        )) as { length: number };

        console.log(
            `Successfully reloaded ${data.length} application (/) commands.`
        );
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
