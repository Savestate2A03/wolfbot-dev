import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

// DynamoDB interfacing library for keeping track of user information. Previously
// used a JSON file, but that doesn't really work in an AWS Lambda environment lol.
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.DYNAMODB_TABLE_NAME!;

export interface LunchData {
    coords?: { lat: number; lng: number };
    address?: string;
    places?: string[];
}

export async function getLunchData(userId: string): Promise<LunchData | null> {
    // grab a user's LunchData via their user id
    const result = await ddb.send(
        new GetCommand({
            TableName: tableName,
            Key: { pk: `USER#${userId}`, sk: "LUNCH_DATA" },
        }),
    );
    if (!result.Item) return null;
    return {
        coords: result.Item.coords,
        address: result.Item.address,
        places: result.Item.places,
    };
}

export async function putLunchData(userId: string, data: LunchData): Promise<void> {
    // set a user's LunchData via their user id
    await ddb.send(
        new PutCommand({
            TableName: tableName,
            Item: {
                pk: `USER#${userId}`,
                sk: "LUNCH_DATA",
                ...data,
                updatedAt: Math.floor(Date.now() / 1000),
            },
        }),
    );
}
