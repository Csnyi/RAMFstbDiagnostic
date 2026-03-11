/**
 * snr_app.js
 * SNR live measurement view:
 *   – EventSource lifecycle (start / stop / reset)
 *   – per-second data aggregation and IndexedDB persistence
 *   – RSSI calculation
 *   – JSON and Excel export
 *   – timed auto-stop
 */

// ── State ──────────────────────────────────────────────────────────────────────

let eventSourceSnr;
let eventSourceSnrInterval;
let fpsCounter   = 0;
let countResponse = 1;
let countWait    = 1;
let tpData       = '';
let startOn      = false;
let firstPlotRelay = true;

/** Raw samples collected during the current 1-second window. */
let collectedData = emptyCollectedData();

function emptyCollectedData() {
    return {
        lock:           [],
        carrier_offset: [],
        snr:            [],
        lm_snr:         [],
        lnb_voltage:    [],
        psu_voltage:    [],
        alfa:           [],
        beta:           [],
        gamma:          [],
        lnb_current:    []
    };
}

// ── Measurement lifecycle ──────────────────────────────────────────────────────

/**
 * Sends the initSmartSNR command to the STB with the current UI parameters.
 */
function initSmartSNR() {
    const ip       = localStorage.getItem('ip');
    const freq     = Number($('#freq').val());
    const freq_lo  = Number($('#freq_lo').val());
    const freq_if  = freq - freq_lo;
    const sr       = Number($('#sr').val());
    const pol      = $('#pol').val();
    const tone     = $('#tone').val();
    const dsq      = $('#dsq').val();
    const slnbe    = $('#slnbe').val();
    const dmd      = $('#dmd').val();
    const modulation = $('#modulation').val();

    tpData = `${freq} ${pol == 0 ? 'H' : 'V'} ${sr}`;

    const params = {
        command: 'initSmartSNR',
        state: 'on',
        mode: 'snr',
        freq: freq_if,
        sr,
        pol,
        tone,
        diseqc_hex: dsq,
        smart_lnb_enabled: slnbe
    };

    if (dmd == 2) {
        params.freq       = freq / 1000;
        params.dmd        = dmd;
        params.modulation = modulation;
    }

    const url = new URL(`http://${ip}/public`);
    url.search = new URLSearchParams(params).toString();

    fetch(url).catch(err => {
        logError('<div class="alert">Network Error!</div>');
        eventSourceSnr?.close();
        clearInterval(eventSourceSnrInterval);
        log('');
        console.error('initSmartSNR:', err);
    });
}

/**
 * Opens the EventSource and starts the 1-second aggregation interval.
 */
function start() {
    if (eventSourceSnr) {
        eventSourceSnr.close();
        clearInterval(eventSourceSnrInterval);
    }

    resetDatabase();
    initSmartSNR();

    const ip = localStorage.getItem('ip');
    eventSourceSnr = new EventSource(`http://${ip}/public?command=startEvents`);

    eventSourceSnr.onerror = function () {
        if (this.readyState === EventSource.CONNECTING) return;
        clearInterval(eventSourceSnrInterval);
        eventSourceSnr.close();
        logError('<div class="alert">A connection error occurred.</div>');
        console.log('EventSource reconnecting…');
        setTimeout(start, 1000);
    };

    if (eventSourceSnr.readyState === 0) logError('Connecting…');

    eventSourceSnr.addEventListener('update', ({ data }) => {
        const response = JSON.parse(data);
        handleSnrEvent(response);
        fpsCounter++;
    });

    eventSourceSnrInterval = setInterval(processData, 1000);
}

function handleSnrEvent(response) {
    if (response.ret_code == null) {
        const status = response.scan_status ?? 'Locked';
        logError(`Connection status: ${status}`);
    } else {
        const ERRORS = {
            KEY_PRESSED_ERR:       'Busy by TV User',
            ONE_CLIENT_ALLOWED_ERR:'Busy by APP User',
            STB_BUSY_ERR:          'Operation is not finished',
            STREAMING_ERR:         'Busy by IPTV User'
        };
        if (ERRORS[response.ret_code]) logError(ERRORS[response.ret_code]);
        eventSourceSnr.close();
        clearInterval(eventSourceSnrInterval);
        return;
    }

    // Accumulate samples into the current window
    Object.keys(collectedData).forEach(key => {
        if (response[key] !== undefined) collectedData[key].push(response[key]);
    });

    // RSSI (only in satellite DVB-S/S2 mode, tune_mode 0)
    if (response.tune_mode === 0) {
        const dmd      = Number($('#dmd').val());
        const rssi_dbuv = dmd === 0
            ? (112 - response.lpg / 100).toFixed(0)
            : (response.lpg + 107.5).toFixed(0);
        $('#RSSI_dBuV').html(rssi_dbuv);
    }
}

/**
 * Closes the EventSource and shows the session summary.
 * @param {Object} [streamedData] - Column-oriented data from IndexedDB.
 */
function stop(streamedData) {
    if (!eventSourceSnr) return;
    eventSourceSnr.close();
    clearInterval(eventSourceSnrInterval);
    $('#fpsSnr').html(0);
    $('#RSSI_dBuV').html(0);

    if (streamedData?.timestamp?.length) {
        const from = new Date(streamedData.timestamp[0]).toLocaleString();
        const to   = new Date(streamedData.timestamp[streamedData.timestamp.length - 1]).toLocaleString();
        logError(`Request stopped!<br><br>Start: ${from}<br>Stop: ${to}`);
    }
}

/**
 * Resets all state and re-initialises the charts.
 */
function reset() {
    initPlotSnr();
    logError('');
    log('');
    $('#fileName, #progressText').html('');
    $('#fpsSnr, #RSSI_dBuV').html(0);
    collectedData  = emptyCollectedData();
    countResponse  = 1;
    countWait      = 1;
    fpsCounter     = 0;
    tpData         = '';
    firstPlotRelay = true;
}

// ── Per-second aggregation ─────────────────────────────────────────────────────

function processData() {
    if (!collectedData.snr.length) {
        log(`Waiting for a response from the server. ${countWait++} sec`);
        return;
    }

    $('#fpsSnr').html(fpsCounter);

    const avg = (arr, n = 2) => parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(n));

    const infoLock      = avg(collectedData.lock) === 1 ? 'Locked' : 'Not Locked';
    const avgCarrOff    = avg(collectedData.carrier_offset);
    const avgSnr        = avg(collectedData.snr);
    const avgLmSnr      = avg(collectedData.lm_snr);
    const avgLnbVoltage = avg(collectedData.lnb_voltage, 0);
    const avgPsuVoltage = avg(collectedData.psu_voltage, 0);
    const avgAlfa       = avg(collectedData.alfa);
    const avgBeta       = avg(collectedData.beta);
    const avgGamma      = avg(collectedData.gamma);
    const avgLnbCurrent = avg(collectedData.lnb_current);

    const dataPerSec = {
        tpVal:          tpData,
        timestamp:      Date.now(),
        lock:           avg(collectedData.lock),
        carrier_offset: avgCarrOff,
        snr:            avgSnr,
        lm_snr:         avgLmSnr,
        lnb_voltage:    avgLnbVoltage,
        psu_voltage:    avgPsuVoltage,
        alfa:           avgAlfa,
        beta:           avgBeta,
        gamma:          avgGamma,
        lnb_current:    avgLnbCurrent
    };

    saveToIDB(dataPerSec);

    // Auto-stop when the user-defined duration is reached
    const setTime = Number($('#setTime').val());
    if (setTime > 0 && countResponse === setTime * 60) {
        startOn = false;
        retrieveData().then(stop);
    }

    log(`<p>Processed Data: ${countResponse++}</p>
        <div class="warn">Current data:<br>
        Alfa: ${avgAlfa}°,<br>
        Beta: ${avgBeta}°,<br>
        Gamma: ${avgGamma}°,<br>
        LNB Current: ${avgLnbCurrent} mA<br>
        Carrier Offset: ${(avgCarrOff / 1000).toFixed(1)} MHz
        </div>`);

    updateChartSnr(infoLock, avgSnr, avgLmSnr, avgLnbVoltage, avgPsuVoltage);

    collectedData = emptyCollectedData();
    fpsCounter    = 0;
}

// ── Export helpers ─────────────────────────────────────────────────────────────

/**
 * Builds a filename-safe string from the current date and transponder data.
 * @returns {string}
 */
function nameGenerator(tpVal) {
    const date      = new Date().toLocaleDateString().replace(/\.\s?/g, '');
    const tpStr     = tpVal.replace(/\s/g, '');
    return `${date}${tpStr}`;
}

/**
 * Downloads all stored measurements as a JSON file.
 */
function downloadDataAsJSON() {
    retrieveData()
        .then(storedData => {
            if (!storedData.tpVal.length) throw new Error('Empty Storage!');
            const href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(storedData));
            const a    = Object.assign(document.createElement('a'), {
                href,
                download: `snr${nameGenerator(storedData.tpVal[0])}.json`
            });
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch(err => logError(`<div class="alert">No data available! ${err}</div>`));
}

/**
 * Downloads all stored measurements as an Excel (.xlsx) file.
 */
function downloadDataAsExcel() {
    retrieveData()
        .then(storedData => {
            if (!storedData.tpVal.length) throw new Error('Empty Storage!');
            const keys  = Object.keys(storedData);
            const rows  = storedData[keys[1]].map((_, i) => {
                const row = {};
                keys.forEach(k => { row[k] = storedData[k][i]; });
                return row;
            });
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Data');
            XLSX.writeFile(wb, `snr${nameGenerator(storedData.tpVal[0])}.xlsx`);
        })
        .catch(err => logError(`<div class="alert">No data available! ${err}</div>`));
}

// ── Log helpers ────────────────────────────────────────────────────────────────

function log(msg)      { document.getElementById('logElem').innerHTML   = `${msg}<br>`; }
function logError(msg) { document.getElementById('errorElem').innerHTML = `${msg}<br>`; }

// ── jQuery ready ───────────────────────────────────────────────────────────────

$(function () {
    reset();

    $('#startLink').on('click', () => {
        startOn = true;
        start();
    });

    $('#stopLink').on('click', () => {
        if (!startOn) return;
        startOn = false;
        retrieveData()
            .then(stop)
            .catch(err => { stop(); console.error('stopLink:', err); });
    });

    $('#resetLink').on('click', () => {
        if (!startOn) reset();
    });

    $('#lastDataLink').on('click', () => {
        if (startOn) return;
        reset();
        retrieveData()
            .then(data => {
                if (!data.tpVal.length) {
                    logError('<div class="alert">No data available!</div>');
                    return;
                }
                modalLoaderOn();
                setTimeout(() => streamedDataProcess(data, 'Stored Data'), 0);
            })
            .catch(err => {
                modalLoaderOff();
                console.error('lastDataLink:', err);
                logError('<div class="alert">No data available!</div>');
            });
    });

    $('#toJsonLink').on('click', () => { if (!startOn) downloadDataAsJSON(); });
    $('#toXlsxLink').on('click', () => { if (!startOn) downloadDataAsExcel(); });

    $('#openSnrJsonBtn').on('click', e => {
        if (startOn) { e.preventDefault(); return; }
        reset();
        loadSnrJson();
    });
});
