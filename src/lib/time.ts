import { DateTime } from "luxon";
import { Chrono } from "chrono-node";
import { Nullable } from "./types";

export function parseToZone(text: string, ianaZone: string): Nullable<Date> {
    const chrono = new Chrono();

    const nowInZone = DateTime.now().setZone(ianaZone);
    const referenceDate = nowInZone.toJSDate();

    const results = chrono.parse(text, referenceDate);
    if (results.length === 0) return null;

    const components = results[0].start;

    const year = components.get("year") as number;
    const month = components.get("month") as number;
    const day = components.get("day") as number;
    const hour = components.get("hour") as number;
    const minute = components.get("minute") as number;
    const second = components.get("second") as number;

    const zonedOutput = DateTime.fromObject(
        {
            year,
            month,
            day,
            hour,
            minute,
            second,
        },
        { zone: ianaZone },
    );

    return zonedOutput.toJSDate();
}
