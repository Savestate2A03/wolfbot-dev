// Discord-specific verification logic for bot requests sent to it

// I am surprised there is not a native way to do this.
function hexToUint8Array(hex: string): Uint8Array<ArrayBuffer> {
    // sanity check hex string
    if (hex.length % 2 !== 0) throw new Error(`HEXPLOSION ${hex.length}`);
    const bytes = new Uint8Array(hex.length / 2);
    // parse bytes from string, one byte at a time
    for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substring(i, i + 2), 16);
        if (Number.isNaN(byte)) throw new Error(`WHAT THE HELL DID YOU GIVE ME -> ${i}: ${hex.substring(i, i + 2)}`);
        bytes[i / 2] = byte;
    }
    return bytes;
}

// Primary logic for Discord request verification.
export async function verifyDiscordRequest(
    publicKey: CryptoKey,
    signature: string,
    timestamp: string,
    body: string,
): Promise<boolean> {
    // encode the timestamp and body together, get a Uint8Array<ArrayBuffer>
    const message: Uint8Array<ArrayBuffer> = new TextEncoder().encode(timestamp + body);
    // convert the signature to a Uint8Array<ArrayBuffer>
    const sig = hexToUint8Array(signature);
    // use crypto library to verify the signature and message against the public key and algo
    return crypto.subtle.verify({ name: "Ed25519" }, publicKey, sig, message);
}

// Public Key Singleton
let publicKeyPromise: Promise<CryptoKey> | null = null;

export function getPublicKey(): Promise<CryptoKey> {
    // if not instantiated yet, create the singleton
    if (!publicKeyPromise) {
        publicKeyPromise = crypto.subtle.importKey(
            "raw",
            hexToUint8Array(process.env.DISCORD_PUBLIC_KEY!),
            { name: "Ed25519" },
            false,
            ["verify"],
        );
    }
    return publicKeyPromise;
}
