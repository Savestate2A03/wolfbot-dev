import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import type { DeferredTaskEvent } from "../discord/types.js";

const lambda = new LambdaClient({});

// Self-referencing task deferring (for when things might take a while)
export async function invokeDeferredTask(event: DeferredTaskEvent): Promise<void> {
    await lambda.send(
        new InvokeCommand({
            FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME!,
            InvocationType: "Event",
            Payload: JSON.stringify(event),
        }),
    );
}
