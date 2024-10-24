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

/* function retrieveData() {
    return db.data.toArray().then(function (result) {
        return result;
    });
} */

// Saving data to IndexedDB

// db.data.add:
// array the data points, like streamedData
// measurement/id
function saveToIndexedDB(streamedData) { 
    db.data.clear().then(function() {
        db.data.add(streamedData).then(function() {
            console.log("Data successfully saved to IndexedDB");
        }).catch(function(error) {
            console.log('Error adding data to IndexedDB: ' + error);
        });
    }).catch(function(error) {
        console.log('Error opening IndexedDB: ' + error);
    });
} 

function saveToIDB(streamedData) {
    db.data.add(streamedData).then(function() {
        console.log("Data successfully saved to IndexedDB");
    }).catch(function(error) {
        console.log('Error adding data to IndexedDB: ' + error);
    });
}
// data point/id - db.data.bulkAdd
// saveToIndexedDB(mappedData(streamedData));
function mappedData(streamedData) {
    const data = [];
    for (let i = 0; i < streamedData.tpVal.length; i++) {
       data.push({
        tpVal: streamedData.tpVal[i],
        timestamp: streamedData.timestamp[i],
        lock: streamedData.lock[i],
        carrier_offset: streamedData.carrier_offset[i],
        snr: streamedData.snr[i],
        lm_snr: streamedData.lm_snr[i],
        lnb_voltage: streamedData.lnb_voltage[i],
        psu_voltage: streamedData.psu_voltage[i],
        alfa: streamedData.alfa[i],
        beta: streamedData.beta[i],
        gamma: streamedData.gamma[i],
        lnb_current: streamedData.lnb_current[i]
        });
    };
    return data;
}

function retrieveData() {
    return db.data.toArray().then(function (result) {
        // Átalakítjuk a lekérdezett adatokat a kívánt formára
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

        // Végigiterálunk az összes lekérdezett objektumon
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

        return transformedData; // Visszaadjuk az átalakított adatokat
    });
}

// Adatok lekérdezése és megjelenítése
retrieveData().then(function(transformedData) {
    console.log("Transformed data:", transformedData);
});
