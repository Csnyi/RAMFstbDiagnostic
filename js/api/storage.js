/** Declaring a global variable */
var db = initIdb();

/** IDB handling Dexie */

// Initialising Dexie
function initIdb() {
    var db = new Dexie('snrDB');
    db.version(1).stores({
    data: `++id,
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
        lnb_current`
    }); 
    return db;
}

// delete database
function resetDatabase() {
    db.delete().then(() => {
        console.log("Database deleted.");
        db = initIdb(); 
        console.log("Database reinitialized.");
    }).catch((err) => {
        console.error("Error while deleting the database: ", err);
    });
}

// Saving data to IndexedDB

// db.data.add:
// array the data points/id/sec in processData
function saveToIDB(streamedData) {
    db.data.add(streamedData).then(function() {
        console.log("Data successfully saved to IndexedDB");
    }).catch(function(error) {
        console.log('Error adding data to IndexedDB: ' + error);
    });
}

// database query
function retrieveData() {
    return db.data.toArray().then(function (result) {
        const transformedData = {
            tpVal: [],
            timestamp: [],
            lock: [],
            carrier_offset: [],
            snr: [],
            lm_snr: [],
            lnb_voltage: [],
            psu_voltage: [],
            alfa: [],
            beta: [],
            gamma: [],
            lnb_current: [],
            id: []
        };

        result.forEach(item => {
            transformedData.tpVal.push(item.tpVal);
            transformedData.timestamp.push(item.timestamp);
            transformedData.lock.push(item.lock);
            transformedData.carrier_offset.push(item.carrier_offset);
            transformedData.snr.push(item.snr);
            transformedData.lm_snr.push(item.lm_snr);
            transformedData.lnb_voltage.push(item.lnb_voltage);
            transformedData.psu_voltage.push(item.psu_voltage);
            transformedData.alfa.push(item.alfa);
            transformedData.beta.push(item.beta);
            transformedData.gamma.push(item.gamma);
            transformedData.lnb_current.push(item.lnb_current);
            transformedData.id.push(item.id);
        });

        return transformedData; 
    });
}

// Query and display data
retrieveData().then(function(transformedData) {
    console.log("Transformed data:", transformedData);
});

// cache handling

