import fs from 'fs';

const name = 'databases';
const root = `./${name}/`;

type DataContainer<T> = Record<string, T>;

export class WolfDatabase {
    /**
     * Retrieves a typed item from the JSON database.
     * @param {string} db - The name of the database JSON file.
     * @param {string} key - The key to look up
     * @returns {T | null} - Either the value if found, or null
     */
    public get<T>(db: string, key: string): T | null {
        const dbPath = root + db + '.json';
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({ data: {} }), {
                encoding: 'utf8'
            });
        }
        const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8')) as Record<
            string,
            DataContainer<T>
        >;
        if (key in parsed.data) {
            return parsed.data[key];
        }
        return null;
    }

    /**
     * Stores an item to the JSON database.
     * @param {string} db - The name of the database JSON file.
     * @param {string} key - The key to look up
     * @param {T} key - The value to store, run through JSON.stringify()
     */
    public write<T>(db: string, key: string, value: T): void {
        const dbPath = root + db + '.json';
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({ data: {} }), {
                encoding: 'utf8'
            });
        }
        const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8')) as Record<
            string,
            DataContainer<T>
        >;
        parsed.data[key] = value;
        fs.writeFileSync(dbPath, JSON.stringify(parsed), { encoding: 'utf8' });
    }

    /**
     * Make the database folder if it doesn't exist.
     * @constructor
     */
    constructor() {
        if (!fs.existsSync(root)) {
            fs.mkdirSync(name);
        }
    }
}
