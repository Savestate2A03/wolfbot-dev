import { createHash } from 'crypto';

/**
 * Picks a random item from an array.
 * @param {T[]} array - An array with a known type.
 */
export function random_pick<T>(array: T[]): T {
    let index = Math.random() * array.length;
    index = Math.floor(index);
    if (index >= array.length) {
        index = array.length - 1;
    }
    return array[index];
}

/**
 * Resolves a void promise to induce a delay.
 * @param {number} time - A time in milliseconds to delay.
 */
export function delay(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * Picks a random item from an array, changing per-day given a unique modifier.
 * @param {T[]} array - An array with a known type.
 * @param {string} unique_modifier - A unique string (example: user id) to
 * make results unique per context, but not per day.
 */
export function random_pick_daily<T>(array: T[], unique_modifier: string): T {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const dateString = date.toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        dateStyle: 'full'
    });
    const resultHash = createHash('SHA-256')
        .update(dateString + unique_modifier)
        .digest('hex');
    const _32bitHexString = resultHash.substring(0, 8);
    const _32bitInt = parseInt(_32bitHexString, 16);
    return array[_32bitInt % array.length];
}
