// PATCH requests for patching responses originally sent in deferred responses.

import { getBotToken } from "../lib/secrets.js";

export async function postChannelMessage(
    channelId: string,
    content: string,
    mentionUserIds: string[] = [],
): Promise<void> {
    const token = await getBotToken();
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
    const body = JSON.stringify({
        content,
        allowed_mentions: { users: mentionUserIds },
    });

    for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bot ${token}`,
            },
            body,
        });
        if (response.ok) return;
        if (response.status === 429 && attempt < 2) {
            const retryAfter = parseFloat(response.headers.get("Retry-After") ?? "1");
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
        }
        const text = await response.text();
        throw new Error(`postChannelMessage died ${response.status}: ${text}`);
    }
}

export async function patchOriginalResponse(appId: string, interactionToken: string, content: string): Promise<void> {
    const url = `https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`;
    const body = JSON.stringify({ content });

    // retry logic in PATCH attempts
    for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body,
        });
        if (response.ok) return;
        if (response.status === 404 && attempt < 2) {
            // wait a bit, try again
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
        }
        if (response.status === 429 && attempt < 2) {
            // wait a bit, try again using Retry-After header info (if given)
            const retryAfter = parseFloat(response.headers.get("Retry-After") ?? "1");
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
        }
        const text = await response.text();
        throw new Error(`iam ,, sooo sorry omg. plsssss forgiveme i didntm ean it. ;_; ${response.status}: ${text}`);
    }
}
