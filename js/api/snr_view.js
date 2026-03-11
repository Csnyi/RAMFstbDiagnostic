/**
 * snr_view.js
 * SNR measurement view — chart rendering, JSON validation and import,
 * DataTables initialisation, and detailed data display.
 */

// ── Chart configuration ────────────────────────────────────────────────────────

const COMMON_CHART_LAYOUT = {
    xaxis: { title: 'Time',  type: 'category', autorange: true },
    yaxis: { title: 'Value', autorange: true }
};

const CHART_CONFIG = { displaylogo: false, responsive: true };

/**
 * Creates empty SNR and voltage charts.
 */
function initPlotSnr() {
    const emptyTrace = { x: [], y: [], type: 'scatter' };

    Plotly.newPlot(
        'snrChart',
        [{ ...emptyTrace, name: 'SNR' }, { ...emptyTrace, name: 'LM SNR' }],
        { ...COMMON_CHART_LAYOUT, title: 'Signal-to-noise ratio' },
        CHART_CONFIG
    );
    Plotly.newPlot(
        'voltageChart',
        [{ ...emptyTrace, name: 'LNB Voltage' }, { ...emptyTrace, name: 'PSU Voltage' }],
        { ...COMMON_CHART_LAYOUT, title: 'Voltages' },
        CHART_CONFIG
    );
}

/**
 * Appends one second of aggregated data to the live charts.
 *
 * @param {string} infoLock     - 'Locked' or 'Not Locked'
 * @param {number} avgSnr
 * @param {number} avgLmSnr
 * @param {number} avgLnbVoltage
 * @param {number} avgPsuVoltage
 */
function updateChartSnr(infoLock, avgSnr, avgLmSnr, avgLnbVoltage, avgPsuVoltage) {
    const now       = new Date();
    const offsetMs  = now.getTimezoneOffset() * 60 * 1000;
    const timeLabel = `${new Date(now - offsetMs).toISOString()} — ${tpData} — ${infoLock}`;

    Plotly.extendTraces('snrChart',     { x: [[timeLabel], [timeLabel]], y: [[avgSnr],       [avgLmSnr]]      }, [0, 1]);
    Plotly.extendTraces('voltageChart', { x: [[timeLabel], [timeLabel]], y: [[avgLnbVoltage], [avgPsuVoltage]] }, [0, 1]);

    // Auto-range only on the first data point to allow manual zooming afterwards
    if (firstPlotRelay) {
        const autoRange = { 'xaxis.autorange': true, 'yaxis.autorange': true, hovermode: 'x unified' };
        Plotly.relayout('snrChart',     autoRange);
        Plotly.relayout('voltageChart', autoRange);
        firstPlotRelay = false;
    }
}

/**
 * Re-draws both charts from a complete column-oriented data object (JSON file or IDB dump).
 * @param {Object} data
 */
function updateChartJson(data) {
    const tz         = new Date().getTimezoneOffset() * 60 * 1000;
    const lockLabels = data.lock.map(v => v === 1 ? 'Locked' : 'Not locked');
    const timeLabels = data.timestamp.map((ts, i) =>
        `${new Date(ts - tz).toISOString()} — ${data.tpVal[i]} — ${lockLabels[i]}`
    );

    const layout = { ...COMMON_CHART_LAYOUT, hovermode: 'x unified' };

    Plotly.react('snrChart',
        [{ x: timeLabels, y: data.snr,        type: 'scatter', name: 'SNR'        },
         { x: timeLabels, y: data.lm_snr,     type: 'scatter', name: 'LM SNR'     }],
        { ...layout, title: 'Signal-to-noise ratio' }
    );
    Plotly.react('voltageChart',
        [{ x: timeLabels, y: data.lnb_voltage, type: 'scatter', name: 'LNB Voltage' },
         { x: timeLabels, y: data.psu_voltage,  type: 'scatter', name: 'PSU Voltage' }],
        { ...layout, title: 'Voltages' }
    );
}

// ── JSON validation ────────────────────────────────────────────────────────────

const SNR_REQUIRED_KEYS = [
    'lock', 'snr', 'lm_snr', 'alfa', 'beta', 'gamma',
    'lnb_current', 'lnb_voltage', 'psu_voltage', 'timestamp'
];

/**
 * Validates that the object contains all required keys and that
 * every value array contains only numbers.
 * @param {Object} obj
 * @returns {boolean}
 */
function validateJsonKey(obj) {
    return SNR_REQUIRED_KEYS.every(key => {
        if (!(key in obj)) {
            console.error(`Missing JSON key: ${key}`);
            return false;
        }
        if (!obj[key].every(v => typeof v === 'number')) {
            console.error(`Non-numeric value found in key: ${key}`);
            return false;
        }
        return true;
    });
}

/**
 * Reads a JSON file, validates it and triggers data processing.
 * @param {File} file
 */
function readJson(file) {
    const reader = new FileReader();
    $('#fileName').html(`<div class="success text-center">View — ${file.name}</div>`);

    reader.addEventListener('load', ({ target }) => {
        let parsed;
        try { parsed = JSON.parse(target.result); } catch {
            logError(`<div class="alert">The selected [${file.name}] is not valid JSON.</div>`);
            return;
        }
        if (!('lock' in parsed) || !validateJsonKey(parsed)) {
            logError(`<div class="alert">The selected [${file.name}] has an incorrect JSON structure.</div>`);
            return;
        }
        streamedDataProcess(parsed, 'JSON Data');
    });

    reader.readAsText(file);
}

// ── Data detail view ───────────────────────────────────────────────────────────

/**
 * Formats an array of numbers with a unit suffix.
 * @param {number[]} arr
 * @param {string}   unit
 * @returns {string[]}
 */
function detailsData(arr, unit) {
    return arr.map(v => `${v.toFixed(2)}${unit}`);
}

/**
 * Builds the detail panel HTML with inline DataTable modals for each metric,
 * then initialises the DataTables.
 * @param {Object} allData  - Column-oriented measurement data.
 * @param {string} headText - Label shown in the error/info area.
 */
function streamedDataProcess(allData, headText) {
    updateChartJson(allData);

    const tz           = new Date().getTimezoneOffset() * 60 * 1000;
    const detailsAlfa  = detailsData(allData.alfa, '°');
    const detailsBeta  = detailsData(allData.beta, '°');
    const detailsGamma = detailsData(allData.gamma, '°');
    const detailsLock  = allData.lock.map(v => v === 1 ? 'Locked' : 'Not locked');
    const detailsLnb   = detailsData(allData.lnb_current, ' mA');
    const carrOffMhz   = allData.carrier_offset.map(v => v / 1000);
    const detailsCarr  = detailsData(carrOffMhz, ' MHz');

    const metrics = [
        { id: 'Alfa',   label: `Alfa: ${allData.alfa[0]}°`,              data: detailsAlfa,  header: 'Alfa'           },
        { id: 'Beta',   label: `Beta: ${allData.beta[0]}°`,              data: detailsBeta,  header: 'Beta'           },
        { id: 'Gamma',  label: `Gamma: ${allData.gamma[0]}°`,            data: detailsGamma, header: 'Gamma'          },
        { id: 'Lock',   label: `Lock: ${detailsLock[0]}`,                data: detailsLock,  header: 'Lock'           },
        { id: 'Lnb',    label: `LNB Current: ${allData.lnb_current[0]} mA`, data: detailsLnb, header: 'LNB current'  },
        { id: 'Co',     label: `Carrier offset: ${carrOffMhz[0].toFixed(2)} MHz`, data: detailsCarr, header: 'Carrier offset' }
    ];

    const modalHtml = metrics.map(({ id, label, header }, i) => `
        <li class="modalBtnDt" id="modalBtn${id}">${label}</li>
        <div id="trunkModal${id}" class="modalDt">
            <div class="modal-content">
                <span class="closeDt">&times;</span>
                <h3>${header}:</h3>
                <table id="datalist${i}" class="display datalist" style="width:100%"></table>
            </div>
        </div>`).join('');

    log(`<div class="content">
        Data: ${allData.alfa.length}<br>
        From: ${new Date(allData.timestamp[0]).toLocaleString()}<br>
        To:   ${new Date(allData.timestamp[allData.timestamp.length - 1]).toLocaleString()}<br><br>
        <div class="menu"><ul>${modalHtml}</ul></div>
    </div>`);

    const timeLabels = allData.timestamp.map(ts => new Date(ts - tz).toLocaleString());
    const dataSets   = [detailsAlfa, detailsBeta, detailsGamma, detailsLock, detailsLnb, detailsCarr]
        .map(series => series.map((val, i) => [val, timeLabels[i]]));

    initDataTables(dataSets);

    logError(`${headText}<br><div class="success">Transponder: ${allData.tpVal[0]}</div>`);
    toggleModal('.modalDt', '.modalBtnDt', '.closeDt');
}

// ── DataTables ─────────────────────────────────────────────────────────────────

let infoTables = [];

/**
 * Destroys any existing DataTable instances and creates fresh ones.
 * @param {Array<Array>} dataSets - One array of [value, time] rows per table.
 */
function initDataTables(dataSets) {
    infoTables.forEach(t => t.destroy());
    infoTables = [];

    document.querySelectorAll('.datalist').forEach((el, i) => {
        infoTables.push($(el).DataTable({
            columns: [{ title: 'Value:' }, { title: 'Time:' }],
            data:    dataSets[i],
            destroy: true
        }));
    });

    modalLoaderOff();
    reportComplete();
}

// ── JSON file input ────────────────────────────────────────────────────────────

/**
 * Attaches a change listener to the SNR file input and validates the selection.
 */
function loadSnrJson() {
    const input = document.getElementById('fileinput-snr');
    input.value = '';

    input.onchange = () => {
        if (!input.files.length) {
            logError('No JSON selected!');
            return;
        }
        const file = input.files[0];
        const ext  = file.name.split('.').pop().toLowerCase();
        if (ext !== 'json' && file.type !== 'application/json') {
            logError(`<div class="alert">Incorrect file extension: ${file.name}</div>`);
            return;
        }
        modalLoaderOn();
        disablePageRefresh();
        readJson(file);
    };
}
