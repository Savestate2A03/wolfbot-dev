import {
    SchedulerClient,
    CreateScheduleCommand,
    DeleteScheduleCommand,
    ResourceNotFoundException,
} from "@aws-sdk/client-scheduler";
import type { ReminderTaskEvent } from "../discord/types.js";

const scheduler = new SchedulerClient({});

function groupName(): string {
    const g = process.env.SCHEDULER_GROUP_NAME;
    if (!g) throw new Error("SCHEDULER_GROUP_NAME not set");
    return g;
}

function roleArn(): string {
    const r = process.env.SCHEDULER_ROLE_ARN;
    if (!r) throw new Error("SCHEDULER_ROLE_ARN not set");
    return r;
}

function functionArn(): string {
    const arn = process.env.BOT_FUNCTION_ARN;
    if (!arn) throw new Error("BOT_FUNCTION_ARN not set");
    return arn;
}

export interface ReminderSchedule {
    id: string;
    fireAtMs: number;
    payload: ReminderTaskEvent;
}

function scheduleNameFor(guildId: string, watchId: string): string {
    // max 64 chars, [0-9a-zA-Z-_.]
    return `sw-${guildId}-${watchId}`.slice(0, 64);
}

function toScheduleExpression(fireAtMs: number): string {
    // at(yyyy-mm-ddThh:mm:ss)
    const d = new Date(fireAtMs);
    const iso = d.toISOString().slice(0, 19);
    return `at(${iso})`;
}

export async function createReminder(
    guildId: string,
    watchId: string,
    fireAtMs: number,
    payload: ReminderTaskEvent,
): Promise<void> {
    if (fireAtMs <= Date.now()) return; // past or now — skip
    await scheduler.send(
        new CreateScheduleCommand({
            Name: scheduleNameFor(guildId, watchId),
            GroupName: groupName(),
            ScheduleExpression: toScheduleExpression(fireAtMs),
            ScheduleExpressionTimezone: "UTC",
            FlexibleTimeWindow: { Mode: "OFF" },
            ActionAfterCompletion: "DELETE",
            Target: {
                Arn: functionArn(),
                RoleArn: roleArn(),
                Input: JSON.stringify(payload),
            },
        }),
    );
}

export async function deleteReminder(guildId: string, watchId: string): Promise<void> {
    try {
        await scheduler.send(
            new DeleteScheduleCommand({
                Name: scheduleNameFor(guildId, watchId),
                GroupName: groupName(),
            }),
        );
    } catch (err) {
        if (err instanceof ResourceNotFoundException) return;
        throw err;
    }
}
