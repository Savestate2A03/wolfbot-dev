import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { verifyDiscordRequest, getPublicKey } from "./discord/verify.js";
import { pong, message, error } from "./discord/respond.js";
import { patchOriginalResponse } from "./discord/api.js";
import type { DiscordInteraction, DeferredTaskEvent, ReminderTaskEvent } from "./discord/types.js";
import { InteractionType } from "./discord/types.js";
import { getCommand, isDeferredCommand, isReminderCommand } from "./commands/registry.js";
import "./commands/src/index.js";

/* Main AWS handler */

// Split routing. If it's a deferred task, route it there, otherwise it's likely a
// new HTTP request. Handle each accordingly, otherwise explode into 1000 pieces.
export const handler = async (event: APIGatewayProxyEventV2 | DeferredTaskEvent | ReminderTaskEvent) => {
    if ("deferredTask" in event) {
        return handleDeferredTask(event as DeferredTaskEvent);
    }
    if ("reminderTask" in event) {
        return handleReminderTask(event as ReminderTaskEvent);
    }
    if ("requestContext" in event) {
        return handleHttpRequest(event as APIGatewayProxyEventV2);
    }
    return { statusCode: 400, body: "holy moley WHAT" };
};

/* Handler routing */

// HTTP Requests
async function handleHttpRequest(event: APIGatewayProxyEventV2) {
    try {
        // if the request is base64, decode it first
        const body = event.isBase64Encoded ? Buffer.from(event.body!, "base64").toString("utf-8") : event.body!;

        // grab signature and timestamp headers
        const signature = event.headers["x-signature-ed25519"];
        const timestamp = event.headers["x-signature-timestamp"];
        if (!signature || !timestamp) {
            return error(401, "no siggy x_x ...");
        }

        // verify the discord request from our bot's public key
        const publicKey = await getPublicKey();
        const valid = await verifyDiscordRequest(publicKey, signature, timestamp, body);
        if (!valid) {
            return error(401, "INTRUDER ALERT !!!!!! OMG");
        }

        // parse the Discord interaction
        const interaction: DiscordInteraction = JSON.parse(body);

        if (interaction.type === InteractionType.PING) {
            return pong();
        }

        // if it's a slash command, attempt to run it
        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            if (!interaction.data) {
                return error(400, "WHERE IS THE INTERACTION DATA ??? what !?!?!");
            }
            const cmd = getCommand(interaction.data.name);
            if (!cmd) {
                return message("bro . lol. i have NO idea.");
            }
            return cmd.handle(interaction);
        }

        // if we don't handle the interaction asked for...
        return error(400, "ok literally what is this interaction.");
    } catch (err) {
        // other errors
        console.error("INTERNAL EXPLOSION ERROR DIE -> ", err);
        return error(500, "INTERNAL EXPLOSION ERROR DIE");
    }
}

// Reminder Tasks (EventBridge)
async function handleReminderTask(event: ReminderTaskEvent) {
    console.log("REMINDER TASK IS ON !!!", event.command, event.guildId, event.uuid);
    const cmd = getCommand(event.command);
    if (!cmd || !isReminderCommand(cmd)) {
        console.error("oh boy, no reminder handler for command", event.command);
        return { statusCode: 200, body: "ok" };
    }
    try {
        await cmd.handleReminder(event);
    } catch (err) {
        console.error("REMINDER TASK EXPLOSION", err);
    }
    return { statusCode: 200, body: "ok" };
}

// Deferred Tasks
async function handleDeferredTask(event: DeferredTaskEvent) {
    const { applicationId, interactionToken, command } = event;
    console.log("THE DEFERRED TASK IS BECOMING !", event.command, event.subcommand, "THE INITATOR:", event.userId);

    const deferredCommand = getCommand(command);
    if (!deferredCommand || !isDeferredCommand(deferredCommand)) {
        console.error("is someone trying to be evil ????? no matching command ??? this is so sad.", command);
        await patchOriginalResponse(applicationId, interactionToken, "die exploded. this is your fault.");
        return { statusCode: 200, body: "ok" };
    }

    await deferredCommand.handleDeferred(event);
    return { statusCode: 200, body: "ok" };
}
