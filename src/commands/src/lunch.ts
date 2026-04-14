import { message, deferred } from "../../discord/respond.js";
import { patchOriginalResponse } from "../../discord/api.js";
import { getUser, getSubcommand } from "../../discord/types.js";
import type { DeferredTaskEvent, DiscordInteraction, DiscordUser } from "../../discord/types.js";
import { registerCommand } from "../registry.js";
import type { DeferredCommand } from "../registry.js";
import { getLunchData, LunchData, putLunchData } from "../../lib/db.js";
import { randomPickDaily } from "../../lib/daily-pick.js";
import { GeoCode, geocode, searchNearbyRestaurants } from "../../lib/google.js";
import { invokeDeferredTask } from "../../lib/invoke.js";

const lunch: DeferredCommand = {
    definition: {
        name: "lunch",
        description: "Food.",
        type: 1,
        // options and sub-options definition
        options: [
            { name: "get", description: "Food.", type: 1 },
            {
                name: "set",
                description: "ur location",
                type: 1,
                options: [
                    {
                        name: "location",
                        description: "u can type anything rly. it uses googl lol",
                        type: 3,
                        required: true,
                    },
                ],
            },
            { name: "refresh", description: "update ur localz", type: 1 },
        ],
    },
    handle: async (interaction: DiscordInteraction) => {
        // main handle for logic
        const user: DiscordUser = getUser(interaction);
        const { subcommand, options } = getSubcommand(interaction.data!);

        // if we are getting lunch, check db and run the random daily pick
        if (subcommand === "get") {
            const data: LunchData | null = await getLunchData(user.id);
            if (!data?.places || data.places.length === 0) {
                if (!data?.places) {
                    return message("did u not set ur location ??? did u not run REFRESH ????? god.");
                }
                return message("bro theres literally NO restaurants found near u LMFAOOO");
            }
            return message(randomPickDaily(data.places, user.id));
        }

        // if we are setting or refreshing lunch options, defer the task
        if (subcommand === "set" || subcommand === "refresh") {
            const event: DeferredTaskEvent = {
                deferredTask: true,
                interactionToken: interaction.token,
                applicationId: interaction.application_id,
                userId: user.id,
                command: "lunch",
                subcommand,
                options: Object.fromEntries(options),
            };
            try {
                await invokeDeferredTask(event);
            } catch (err) {
                console.error("defer died x_x", err);
                return message("ok so like i exploded. aaaaand this is ur fault");
            }
            return deferred();
        }

        // unknown subcommand
        return message("what ?? how ?????? did you do that??????");
    },

    // deferred task handling for lunch commands
    handleDeferred: async (event) => {
        const { applicationId, interactionToken, userId, subcommand, options } = event;

        try {
            if (subcommand === "set") {
                // setting location
                const location = options.location as string;
                const result: GeoCode | null = await geocode(location);
                if (!result) {
                    await patchOriginalResponse(
                        applicationId,
                        interactionToken,
                        "google doesn't know where that is lol",
                    );
                    return;
                }
                // update db with user lunch data
                await putLunchData(userId, {
                    coords: result.coords,
                    address: result.formattedAddress,
                });
                // be evil
                await patchOriginalResponse(
                    applicationId,
                    interactionToken,
                    "i know where u live... " + result.formattedAddress.toLowerCase() + "... >:3",
                );
            } else if (subcommand === "refresh") {
                // updating the results of the places to eat nearby
                const data: LunchData | null = await getLunchData(userId);
                if (!data?.coords) {
                    // if no address info found
                    await patchOriginalResponse(
                        applicationId,
                        interactionToken,
                        "did you actually try this . before updating ur address???? idiot.",
                    );
                    return;
                }
                // grab places nearby
                const places = await searchNearbyRestaurants(data.coords.lat, data.coords.lng);
                // put the places in the db
                await putLunchData(userId, { ...data, places });
                // update original response
                await patchOriginalResponse(
                    applicationId,
                    interactionToken,
                    "holy shit i did it . ur eateries r updated :3",
                );
            }
        } catch (err) {
            console.error("EPIC LUNCH FAIL", err);
            await patchOriginalResponse(
                applicationId,
                interactionToken,
                "epic lunch failure ... lol . actually wait. wtf WHY did that happen????",
            );
        }
    },
};

registerCommand(lunch);
