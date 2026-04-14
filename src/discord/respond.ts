import { InteractionResponseType } from "./types.js";

/* Response functions */

// Ping!
export function pong() {
    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: InteractionResponseType.PONG }),
    };
}

// Generic Message
export function message(content: string) {
    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content },
        }),
    };
}

// Deferred Message
export function deferred() {
    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        }),
    };
}

// Error Response
export function error(statusCode: number, msg: string) {
    return { statusCode, body: msg };
}
