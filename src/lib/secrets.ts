import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const sm = new SecretsManagerClient({});
const cache = new Map<string, string>();

export async function getSecret(arnOrName: string): Promise<string> {
    const cached = cache.get(arnOrName);
    if (cached) return cached;
    const result = await sm.send(new GetSecretValueCommand({ SecretId: arnOrName }));
    const value = result.SecretString;
    if (!value) throw new Error(`secret ${arnOrName} has no string value??`);
    cache.set(arnOrName, value);
    return value;
}

export async function getBotToken(): Promise<string> {
    const arn = process.env.DISCORD_BOT_TOKEN_SECRET_ARN;
    if (!arn) throw new Error("DISCORD_BOT_TOKEN_SECRET_ARN not set");
    return getSecret(arn);
}
