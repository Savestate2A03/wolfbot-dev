import { message } from "../../discord/respond.js";
import { getUser } from "../../discord/types.js";
import { registerCommand } from "../registry.js";
import type { Command } from "../registry.js";
import { randomPickDaily } from "../../lib/daily-pick.js";

// the legend ...
const lumches = [
    "Zaxby's",
    "Dunkin'",
    "McDonalds",
    "Chipotle",
    "Chick-fil-A",
    "Wendy's",
    "Cookout",
    "Bojangles",
    "Waffle House",
    "Taco Bell",
    "Pizza",
    "depression nap",
    "Subway",
    "just vape until you're not hungry",
    "Jimmy John's",
    "drink water",
    "Firehouse",
    "Sheetz",
    "the local mexican joint",
    "cook because poor",
    "Burger King",
    "Chinese",
];

const lumch: Command = {
    definition: {
        name: "lumch",
        description: "foob.",
        type: 1,
    },
    handle: (interaction) => {
        const user = getUser(interaction);
        // base daily random pick on user id
        return message(randomPickDaily(lumches, user.id));
    },
};

registerCommand(lumch);
