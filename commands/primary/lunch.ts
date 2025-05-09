import { ChatInputCommandInteraction, RepliableInteraction } from 'discord.js';
import https from 'https';

import { WolfCommand, WolfCommandInterface } from '@commands/command';
import { delay, random_pick_daily } from '@lib/library';
import { WolfClient } from '@lib/client';
import config from '@config' with { type: 'json' };

interface Coords {
    lat: number;
    lng: number;
}

interface Geocode {
    results: { geometry: { location: Coords }; formatted_address: string }[];
}

interface Place {
    places: [{ displayName: { text: string } }];
}

/**
 * Recommends lunch choices based on your location.
 * @Class
 */
export class Lunch extends WolfCommand implements WolfCommandInterface {
    static readonly _name = 'lunch';
    static readonly _description = 'Food.';

    // Request body provider for updating a user's places
    private buildPlacesRequestBody(lat: number, lng: number) {
        return {
            includedTypes: ['restaurant'],
            maxResultCount: 20,
            locationRestriction: {
                circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: 3300.0
                }
            }
        };
    }

    // Updates the user's location based on a given address string. Asks
    // Google for the latitude and longitude of the address to be passed
    // into their Places API when running updateLocations()
    private update(
        address: string,
        db: string,
        interaction: RepliableInteraction
    ) {
        // Insert address and API key into GET query
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            address
        )}&key=${config.googleMapsApiKey}`;
        // Generate request
        https.get(url, (res) => {
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => {
                // Build response data in chunks if not recieved all at once
                rawData += chunk;
            });
            res.on('end', () => {
                void (async () => {
                    const json = JSON.parse(rawData) as Geocode;
                    const client = interaction.client as WolfClient;
                    // Write the lat/lng to the user database for later use by updateLocations()
                    client
                        .db()
                        .write(db, 'coords', json.results[0].geometry.location);
                    // Not currently used except to provide feedback to the user
                    client
                        .db()
                        .write(
                            db,
                            'address',
                            json.results[0].formatted_address
                        );
                    // editReply() can't immediately modify the reply, give it some time.
                    await delay(2000);
                    await interaction.editReply(
                        'i know where u live... ' +
                            json.results[0].formatted_address.toLowerCase() +
                            '... >:3'
                    );
                })();
            });
        });
    }

    // Communicates with the Google Places API given a user's latitude and longitude
    // to get nearby places to eat. Stores 20 results into the user's JSON database.
    private async updateLocations(
        interaction: RepliableInteraction,
        db: string
    ) {
        const client = interaction.client as WolfClient;
        const coords = client.db().get<Coords>(db, 'coords');
        // If the user hasn't set their coordinates yet, let them know and exit
        if (coords === null) {
            await delay(2000);
            await interaction.editReply(
                'did you actually try this . before updating ur address???? idiot.'
            );
            return;
        }
        // Build the request body with the latitude and longitude of the user
        const data = JSON.stringify(
            this.buildPlacesRequestBody(coords.lat, coords.lng)
        );
        const options = {
            hostname: 'places.googleapis.com',
            port: 443, // or 443 for HTTPS
            path: '/v1/places:searchNearby',
            method: 'POST',
            headers: {
                'X-Goog-Api-Key': config.googleMapsApiKey,
                'X-Goog-FieldMask': 'places.displayName',
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        // Build the request
        const req = https.request(options, (res) => {
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                void (async () => {
                    const json = JSON.parse(rawData) as Place;
                    const client = interaction.client as WolfClient;
                    const places: string[] = [];
                    // Collect all place names and store them into the user JSON database
                    json.places.forEach((place) => {
                        places.push(place.displayName.text);
                    });
                    client.db().write(db, 'places', places);
                    await delay(2000);
                    await interaction.editReply(
                        'holy shit i did it . ur eateries r updated :3'
                    );
                })();
            });
        });
        req.write(data);
        req.end();
        return;
    }

    // The main logic that gets run when the command is detected
    public async execute(
        interaction: RepliableInteraction & ChatInputCommandInteraction
    ) {
        // Determine the user's database ID (used as a filename)
        const db = `lunch-${interaction.user.id}`;
        const client = interaction.client as WolfClient;
        let picks: string[] | null;
        let address: string | null;
        switch (interaction.options.getSubcommand()) {
            case 'get':
                // Requesting a place to eat
                picks = client.db().get<string[]>(db, 'places');
                if (picks === null) {
                    await interaction.reply(
                        'did u not set ur location ??? did u not run REFRESH ????? god.'
                    );
                    return;
                }
                await interaction.reply(
                    // Only change results per-user daily
                    random_pick_daily(picks, interaction.user.id)
                );
                break;
            case 'set':
                // Set the longitude and latitude of a user with Google's API
                address = interaction.options.getString('location');
                if (address === null) {
                    await interaction.reply('NO ADDRESS???');
                    return;
                }
                await interaction.reply('google api time ... epic ...');
                this.update(address, db, interaction);
                break;
            case 'refresh':
                // Update the list of places to eat near the user for 'get'
                await interaction.reply('i am TALKING TO GOOGLE one sec...');
                await this.updateLocations(interaction, db);
                break;
        }
    }
    constructor() {
        // Let our super class know our name and description for tracking
        super(Lunch._name, Lunch._description);
        // Build our commands that we respond to for /lunch
        this.getCommand()
            /*
             *  /lunch get
             */
            .addSubcommand((cmd) => cmd.setName('get').setDescription('Food.'))
            /*
             *  /lunch set [address]
             */
            .addSubcommand((cmd) =>
                cmd
                    .setName('set')
                    .setDescription('ur location')
                    .addStringOption((option) =>
                        option
                            .setRequired(true)
                            .setName('location')
                            .setDescription(
                                'u can type anything rly. it uses googl lol'
                            )
                    )
            )
            /*
             *  /lunch refresh
             */
            .addSubcommand((cmd) =>
                cmd.setName('refresh').setDescription('update ur localz')
            );
    }
}
