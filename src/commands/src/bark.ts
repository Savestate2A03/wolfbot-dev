import { message } from "../../discord/respond.js";
import { registerCommand } from "../registry.js";
import type { Command } from "../registry.js";

// awuf :3

const bark: Command = {
    definition: {
        name: "bark",
        description: "awrruf !!",
        type: 1,
    },
    handle: () => message("awrruf!"),
};

registerCommand(bark);
