// Require the necessary discord.js classes
import { Events, GatewayIntentBits, MessageFlags } from 'discord.js';

import { WolfClient } from '@lib/client';
import { Bark } from '@commands/utility/bark';
import { Lumch } from '@commands/primary/lumch';
import { Lunch } from '@commands/primary/lunch';
import { Source } from '@commands/utility/source';
import config from '@config' with { type: 'json' };

// Create a new client instance using WolfClient extending Client<boolean>
const client = new WolfClient({ intents: [GatewayIntentBits.Guilds] });

// Remember to also add to deploy-commands.ts!
client.add(new Bark());
client.add(new Lumch());
client.add(new Lunch());
client.add(new Source());

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as WolfClient; // Cast to our custom client
    const command = client.get(interaction.commandName);

    if (!command) {
        console.error(
            `No command matching ${interaction.commandName} was found.`
        );
        return;
    }
    try {
        // Attempt to call execute, defined in WolfCommandInterface
        void command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            void interaction.followUp({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral
            });
        } else {
            void interaction.reply({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
});

// Log in to Discord with our token
void client.login(config.token);
