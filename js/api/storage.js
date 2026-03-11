/**
 * storage.js
 * IndexedDB persistence layer via Dexie.js.
 * Provides save, retrieve and reset operations for SNR measurement data.
 */

const DB_NAME = 'snrDB';
const DB_VERSION = 1;

const DATA_SCHEMA = `
    ++id,
    tpVal,
    timestamp,
    lock,
    carrier_offset,
    snr,
    lm_snr,
    lnb_voltage,
    psu_voltage,
    alfa,
    beta,
    gamma,
    lnb_current
`;

/** @type {Dexie} */
let db = initIdb();

function initIdb() {
    const instance = new Dexie(DB_NAME);
    instance.version(DB_VERSION).stores({ data: DATA_SCHEMA });
    return instance;
}

/**
 * Saves a single data-point object to IndexedDB.
 * @param {Object} streamedData
 */
function saveToIDB(streamedData) {
    db.data.add(streamedData)
        .then(() => console.log('Data saved to IndexedDB.'))
        .catch(err => console.error('saveToIDB error:', err));
}

/**
 * Retrieves all stored records and returns them as a column-oriented object
 * (each key maps to an array of values), which is the format expected by the charts.
 * @returns {Promise<Object>}
 */
function retrieveData() {
    return db.data.toArray().then(records => {
        const result = {
            tpVal:          [],
            timestamp:      [],
            lock:           [],
            carrier_offset: [],
            snr:            [],
            lm_snr:         [],
            lnb_voltage:    [],
            psu_voltage:    [],
            alfa:           [],
            beta:           [],
            gamma:          [],
            lnb_current:    [],
            id:             []
        };

        records.forEach(item => {
            Object.keys(result).forEach(key => result[key].push(item[key]));
        });

        return result;
    });
}

/**
 * Drops and re-creates the database, effectively clearing all stored data.
 */
function resetDatabase() {
    db.delete()
        .then(() => {
            console.log('Database deleted.');
            db = initIdb();
            console.log('Database re-initialised.');
        })
        .catch(err => console.error('resetDatabase error:', err));
}
