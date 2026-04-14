import { createHash } from "node:crypto";

// Pick a random item in a list per uniqueModifier per day

export function randomPickDaily<T>(array: T[], uniqueModifier: string): T {
    if (array.length === 0) {
        throw new Error("ok maybe u are being TOO random lol Xd");
    }
    const date = new Date();
    const dateString = date.toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "full",
    });
    // create a hash from the dateString and uniqueModifier
    const hash = createHash("sha256")
        .update(dateString + uniqueModifier)
        .digest("hex");
    // grab the first 8 hex digits in the hash, parse as a hex integer,
    // then modulo it by the array length to pick the random item.
    const index = parseInt(hash.substring(0, 8), 16) % array.length;
    return array[index];
}
