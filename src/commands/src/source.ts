import { message } from "../../discord/respond.js";
import { registerCommand } from "../registry.js";
import type { Command } from "../registry.js";

const source: Command = {
    definition: {
        name: "source",
        description: "teh codez :3",
        type: 1,
    },
    handle: () =>
        message("yipeeeee \\<3 <https://github.com/Savestate2A03/wolfbot-dev/tree/sidebot-dev>"),
};

registerCommand(source);
