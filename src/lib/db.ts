import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { NativeAttributeValue } from "@aws-sdk/util-dynamodb";

// DynamoDB interfacing library for keeping track of user information
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.DYNAMODB_TABLE_NAME!;
const DEFAULT_SK = "SIDEMODE_BOT_SK";

// DynamoDB only allows string/number/binary for keys
export interface PkSkId extends PkSk {
    id: string | number | null;
}

export interface PkSk {
    pk: string | number;
    sk: string | number | null;
}

export interface DynamoDBDatabaseData<T extends NativeAttributeValue = NativeAttributeValue> {
    data: T;
}

export type DynamoDBDatabase<T extends NativeAttributeValue = NativeAttributeValue> = DynamoDBDatabaseData<T> & PkSkId;

export function buildKey({ pk, sk, id }: PkSkId): PkSk {
    return {
        pk: id !== null ? `${pk}#${id}` : `${pk}`,
        sk: sk !== null ? `${sk}` : DEFAULT_SK,
    };
}

export async function getData<T extends NativeAttributeValue = NativeAttributeValue>(
    pkskid: PkSkId,
): Promise<DynamoDBDatabaseData<T> | null> {
    const result = await ddb.send(
        new GetCommand({
            TableName: tableName,
            Key: buildKey(pkskid),
        }),
    );
    if (!result.Item) return null;
    return { data: result.Item.data as T };
}

export async function putData<T extends NativeAttributeValue = NativeAttributeValue>(
    pkskid: PkSkId,
    data: DynamoDBDatabaseData<T>,
): Promise<void> {
    await ddb.send(
        new PutCommand({
            TableName: tableName,
            Item: {
                ...buildKey(pkskid), // top-level pk/sk, not nested under "Key"
                ...data,
                updatedAt: Math.floor(Date.now() / 1000),
            },
        }),
    );
}
