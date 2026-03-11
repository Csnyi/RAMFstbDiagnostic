/**
 * report_main.js
 * Spectrum / CNR report view:
 *   – device connection & version check
 *   – EventSource management for scan progress
 *   – satellite / transponder / report lists
 *   – chart initialisation and updates (Plotly)
 *   – JSON export / import
 */

// ── State ──────────────────────────────────────────────────────────────────────

let reportList    = [];
let reportListNew = [];
let reportData    = [];
let xFreqData     = [];
let ySnrData      = [];
let yLmsnrData    = [];
let yRssiData     = [];
let satName       = '';
let eventSource;
let reportInProgress;

/** DiSEqC port → hex command lookup */
const DSQ = {
    '1.0': { 1: 'E01038F0', 2: 'E01038F4', 3: 'E01038F8', 4: 'E01038FC' },
    '1.1': {
         1: 'E01039F0',  2: 'E01039F1',  3: 'E01039F2',  4: 'E01039F3',
         5: 'E01039F4',  6: 'E01039F5',  7: 'E01039F6',  8: 'E01039F7',
         9: 'E01039F8', 10: 'E01039F9', 11: 'E01039FA', 12: 'E01039FB',
        13: 'E01039FC', 14: 'E01039FD', 15: 'E01039FE', 16: 'E01039FF'
    }
};

// ── DOM references ─────────────────────────────────────────────────────────────

const connMessages  = document.getElementById('connMessage');
const logInfo       = document.getElementById('logInfo');
const logResponse   = document.getElementById('response');
const progressBarConn = document.getElementById('conn-progress-bar');
const progressBar     = document.getElementById('progress-bar');
const progressBarScan = document.getElementById('progress-bar-scan');
const ipInput         = document.getElementById('ip');

// Restore last-used IP
ipInput.value = localStorage.getItem('ip') ?? '';

// ── Progress bar helpers ───────────────────────────────────────────────────────

function setProgressBarConn(width, message) {
    progressBarConn.style.background = '#5f9ea0';
    progressBarConn.textContent      = message;
    progressBarConn.style.width      = `${width}%`;
}

function setProgressBarConnWait(startWidth, message) {
    progressBarConn.style.background = '#5f9ea0';
    progressBarConn.textContent      = message;
    let w = startWidth;
    const id = setInterval(() => {
        progressBarConn.style.width = `${w}%`;
        w += 1;
        if (w >= 90 || document.getElementById('status').textContent === 'Connected') {
            clearInterval(id);
        }
    }, 30);
}

function setProgressBar(width, message) {
    progressBar.style.background = '#5f9ea0';
    progressBar.style.width      = `${width}%`;
    progressBar.textContent      = message;
}

function setProgressBarErr(width, message) {
    progressBar.style.background = '#a05f5f';
    progressBar.style.width      = `${width}%`;
    progressBar.textContent      = message;
}

// ── IP validation ──────────────────────────────────────────────────────────────

const IP_PATTERN = /^(25[0-5]|2[0-4]\d|[01]?\d{1,2})(\.(25[0-5]|2[0-4]\d|[01]?\d{1,2})){3}$/;

function isValidIP(ip) {
    return IP_PATTERN.test(ip);
}

function saveIP(value) {
    if (isValidIP(value)) {
        localStorage.setItem('ip', value);
    } else {
        alert(`Invalid IP: ${value}!`);
    }
    ipInput.value = localStorage.getItem('ip') ?? '';
}

ipInput.addEventListener('change', () => {
    saveIP(ipInput.value);
    getVersion();
});

// ── FPS counter ────────────────────────────────────────────────────────────────

let fpsCounterId;
let counter = 0, localCounter = 0, millisec = Date.now();
localStorage.setItem('fps_counter', '0');

// ── Device connection ──────────────────────────────────────────────────────────

/**
 * Fetches the firmware version from the STB to verify connectivity,
 * then transitions the UI to the report view.
 */
function getVersion() {
    connMessage('');
    const ip = localStorage.getItem('ip');

    if (!ip) {
        connMessage('<div class="alert">Missing IP!</div>');
        setProgressBarConn(100, 'Enter the IP address of the STB!');
        return;
    }

    setProgressBarConn(50, 'Connecting...');
    setTimeout(() => setProgressBarConnWait(50, 'Waiting for STB.'), 1000);

    fetch(`http://${ip}/public?command=version`)
        .then(res => {
            if (!res.ok) throw new Error('Network response is not correct.');
            return res.json();
        })
        .then(data => {
            console.log('getVersion:', data);
            resetLog();
            document.getElementById('fps').textContent    = localStorage.getItem('fps_counter');
            document.getElementById('status').textContent = 'Connected';
            $('.conn').toggle();
            $('.createReport').toggle();
            initPlotCr();
            returnSatList();
            getReportList()
                .then(() => drawGraphs())
                .catch(err => {
                    console.error('getReportList:', err);
                    logElem('<div class="alert">Connection Error!</div>');
                });
        })
        .catch(err => {
            console.error('getVersion:', err);
            reportData = [];
            connMessage('<div class="alert">Network Error!</div>');
            setProgressBarConn(100, 'Try again later!');
        });
}

// ── EventSource ────────────────────────────────────────────────────────────────

function startEventSource(url) {
    if (eventSource) {
        eventSource.close();
        clearInterval(fpsCounterId);
    }

    const ip = localStorage.getItem('ip');
    if (!ip) return;

    const src = url ?? `http://${ip}/public?command=startEvents`;
    eventSource = new EventSource(src);

    eventSource.onerror = function () {
        if (this.readyState === EventSource.CONNECTING) {
            console.log('EventSource reconnecting…');
            return;
        }
        console.log('EventSource error.');
        clearInterval(fpsCounterId);
        setTimeout(startEventSource, 500);
    };

    eventSource.addEventListener('update', ({ data }) => {
        counter++;
        const response = JSON.parse(data);
        handleEventResponse(response);
    });

    fpsCounterId = setInterval(() => {
        const now      = Date.now();
        const elapsed  = now - millisec;
        const delta    = ((counter - localCounter) / elapsed * 1000).toFixed(0);
        millisec       = now;
        localCounter   = counter;
        localStorage.setItem('fps_counter', delta);
        document.getElementById('fps').textContent = delta;
    }, 1000);
}

function handleEventResponse(response) {
    const ip = localStorage.getItem('ip');

    // System not started — reinitialise via commonEvent
    if (response.status_code === 'SYS_NOT_STARTED_ERR') {
        stopEvent('SYS_NOT_STARTED_ERR');
        resetLog();
        fetch(`http://${ip}/public?command=commonEvent`)
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(data => { console.log('commonEvent:', data); startEventSource(); })
            .catch(err => console.error('commonEvent:', err));
        return;
    }

    // Status label
    if (response.ret_code == null) {
        if (document.getElementById('status').textContent !== 'Connected') {
            document.getElementById('status').textContent = 'Connected';
        }
    } else {
        const ERRORS = {
            KEY_PRESSED_ERR:       'Busy by TV User',
            ONE_CLIENT_ALLOWED_ERR:'Busy by APP User',
            STB_BUSY_ERR:          'Operation is not finished',
            STREAMING_ERR:         'Busy by IPTV User'
        };
        if (ERRORS[response.ret_code]) logElem(ERRORS[response.ret_code]);
        stopEvent();
        setTimeout(() => startEventSource(`http://${ip}/public?command=updateSNRAndAxis`), 500);
        return;
    }

    // Scan progress (tune_mode 2)
    if (response.tune_mode === 2) {
        if (response.scan_progress < 100) {
            reportInProgress = true;
            modalScanOn();
            disablePageRefresh();
            document.getElementById('checkStatus').textContent = 'All transponder signal check';
            progressBarScan.style.width   = `${response.scan_progress}%`;
            progressBarScan.textContent   = `${response.scan_progress}%`;
            logResp('The report is being created.');
            return;
        }

        reportComplete();
        modalScanOff();
        stopEvent();
        xFreqData = []; ySnrData = []; yLmsnrData = []; yRssiData = [];

        getLastReport()
            .then(result => result && returnReport(result).then(() => dataToDrawCharts()))
            .catch(err  => logElem(`Error loading last report: ${err}`));
    }

    // Restart event (tune_mode 7)
    if (response.tune_mode === 7) {
        console.log('restart');
        stopEvent('The report has stopped!');
        reportComplete();
        modalScanOff();
    }
}

function stopEvent(message = '') {
    eventSource?.close();
    clearInterval(fpsCounterId);
    localStorage.setItem('fps_counter', '0');
    document.getElementById('fps').textContent = '0';
    setProgressBar(100, message);
}

// ── Page-refresh guard ─────────────────────────────────────────────────────────

function disablePageRefresh() {
    window.onkeydown    = e => e.preventDefault();
    window.onbeforeunload = e => {
        if (!reportInProgress) return;
        e.preventDefault();
        e.returnValue = 'The process is ongoing, are you sure you want to leave the site?';
    };
}

function reportComplete() {
    reportInProgress        = false;
    window.onkeydown        = null;
    window.onbeforeunload   = null;
}

// ── Report generation ──────────────────────────────────────────────────────────

function createReport() {
    const ip    = localStorage.getItem('ip');
    const satId = document.getElementById('satList').value;

    fetch(`http://${ip}/public?command=createReport&sat_id=${satId}`)
        .then(res => { if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`); return res.json(); })
        .then(data => {
            console.log('createReport:', data);
            logElem('The report has been started!');
            startEventSource();
        })
        .catch(err => {
            console.error('createReport:', err);
            logElem('<div class="alert">Network Error!</div>');
            setProgressBarErr(100, 'Connection Error!');
            reportData = [];
        });
}

// ── Report list helpers ────────────────────────────────────────────────────────

/**
 * Returns the symmetric difference between two dir_list arrays,
 * used to identify which report was just created.
 */
function dirListDifference(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
        throw new TypeError('Both arguments must be arrays.');
    }
    const inB = item => b.some(x => x.name === item.name && x.size === item.size);
    const inA = item => a.some(x => x.name === item.name && x.size === item.size);
    return [...a.filter(x => !inB(x)), ...b.filter(x => !inA(x))];
}

/**
 * Converts a raw STB report filename into a human-readable label.
 * Examples:
 *   rpt_130E_HotBird_2024-01-15_12-30  →  Reg 13.0E HotBird 12:30 2024-01-15
 *   stb_ethalon_rpt_…                  →  Ref.room…
 */
function formatReportName(name) {
    if (name.startsWith('stb_ethalon_rpt_')) {
        return name.replace('stb_ethalon_rpt_', 'Ref.room').slice(0, -4);
    }
    if (name.startsWith('dish_ethalon_rpt_')) {
        return name.replace('dish_ethalon_rpt_', 'Ref.dish').slice(0, -4);
    }
    if (name.startsWith('rpt_')) {
        let n = name.replace('rpt_', 'Reg').replace('E_', 'E.').replace('W_', 'W.');
        let parts = n.replace(/-/g, '.').split('_');

        // Divide orbital position by 10 to get degrees (e.g. 130E. → 13.0E.)
        ['E.', 'W.'].forEach(dir => {
            if (parts[1]?.includes(dir)) {
                const [deg, rest] = parts[1].split(dir);
                parts[1] = `${(Number(deg) / 10).toFixed(1)}${dir}${rest}`;
            }
        });

        parts[2] = `${parts[2]}:${parts[3]}`;
        parts.splice(3, 1);
        let label = parts.join(' ');
        label = label.replace('0.0W', 'Terr').replace('9.1E', 'Cab');
        return label;
    }
    return name;
}

/** Populates a <select> element with a given list. */
function optionList(selectId, list) {
    const sel = document.getElementById(selectId);
    sel.innerHTML = '';

    if (selectId === 'dirList') {
        [...list.dir_list]
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(({ name }) => {
                const opt   = document.createElement('option');
                opt.value   = name.slice(0, -4);
                opt.textContent = formatReportName(name);
                sel.appendChild(opt);
            });
        return;
    }

    if (selectId === 'satList') {
        for (let i = 0; i < list.sat_num; i++) {
            const { sat_id, sat_degree, direction, sat_name } = list.sat_list[i];
            const opt = document.createElement('option');
            opt.value = sat_id;
            opt.textContent = `${sat_degree.padStart(5, '0')}${direction} ${sat_name}`;
            sel.appendChild(opt);
        }
        return;
    }

    if (selectId === 'tpList') {
        for (let i = 0; i < list.tp_num; i++) {
            const { idx, freq, polarity, sr } = list.common_param[i];
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${freq} ${polarity} ${sr}`;
            sel.appendChild(opt);
        }
        document.getElementById('tpNum').textContent = list.tp_num;
    }
}

async function getReportList() {
    const ip = localStorage.getItem('ip');
    try {
        const res = await fetch(`http://${ip}/mnt/flash/e/ls.json`);
        if (!res.ok) {
            logElem(`<div class="alert">Error ${res.status}: ${res.statusText}</div>`);
            setProgressBar(50, 'Failed');
            return;
        }
        reportList = await res.json();
        optionList('dirList', reportList);
        setProgressBar(100, 'I am ready! And you...?');
    } catch (err) {
        logElem('<div class="alert">Request failed!</div>');
        setProgressBar(50, 'Failed');
        throw err;
    }
}

async function getLastReport() {
    const ip = localStorage.getItem('ip');
    try {
        const res = await fetch(`http://${ip}/mnt/flash/e/ls.json`);
        if (!res.ok) {
            logElem(`<div class="alert">Error ${res.status}: ${res.statusText}</div>`);
            return;
        }
        reportListNew = await res.json();
        optionList('dirList', reportListNew);

        const diff = dirListDifference(reportList.dir_list, reportListNew.dir_list);
        reportList  = reportListNew;

        const last = diff[diff.length - 1];
        return last ? last.name.slice(0, -4) : undefined;
    } catch (err) {
        logElem('<div class="alert">Request failed!</div>');
        console.error('getLastReport:', err);
    }
}

async function returnReport(reportName) {
    const ip = localStorage.getItem('ip');
    try {
        const res = await fetch(`http://${ip}/public?command=returnReport&report_name=e:/${reportName}.json`);
        if (!res.ok) {
            logElem(`<div class="alert">Error ${res.status}: ${res.statusText}</div>`);
            setProgressBar(100, 'Failed');
            return;
        }
        reportData = await res.json();
        setProgressBar(100, formatReportName(`${reportName}abcd`));
    } catch (err) {
        logElem('<div class="alert">Request failed!</div>');
        setProgressBar(100, 'Failed');
        throw err;
    }
}

// ── Satellite list ─────────────────────────────────────────────────────────────

function returnSatList() {
    const ip = localStorage.getItem('ip');
    fetch(`http://${ip}/public?command=returnSATList`)
        .then(res => { if (!res.ok) throw new Error(res.statusText); return res.json(); })
        .then(data => optionList('satList', data))
        .catch(err => {
            console.error('returnSatList:', err);
            logElem('<div class="alert">Network error!</div>');
        });
}

// ── Charts ─────────────────────────────────────────────────────────────────────

const COMMON_CHART_CONFIG = { displaylogo: false, responsive: true };

const COMMON_AXIS_LAYOUT = {
    xaxis: { title: 'Transponder', type: 'category', autorange: true },
    yaxis: { title: 'Values', autorange: true }
};

function initPlotCr() {
    const emptyTrace = { x: [], y: [], type: 'scatter' };

    Plotly.newPlot('reportCnr',
        [{ ...emptyTrace, name: 'CNR' }, { ...emptyTrace, name: 'LM CNR' }],
        { title: 'CNR report', ...COMMON_AXIS_LAYOUT },
        COMMON_CHART_CONFIG
    );
    Plotly.newPlot('reportRssi',
        [{ ...emptyTrace, name: 'RSSI' }],
        { title: 'RSSI report', ...COMMON_AXIS_LAYOUT },
        COMMON_CHART_CONFIG
    );
}

function updateChartCr(xData, yCnr, yLmCnr, yRssi, title) {
    const layout = {
        ...COMMON_AXIS_LAYOUT,
        xaxis: { ...COMMON_AXIS_LAYOUT.xaxis, tickmode: 'auto', nticks: 8 },
        hovermode: 'x unified'
    };

    Plotly.react('reportCnr',
        [{ x: xData, y: yCnr,   type: 'scatter', name: 'CNR'    },
         { x: xData, y: yLmCnr, type: 'scatter', name: 'LM CNR' }],
        { ...layout, title: `${title} CNR` }
    );
    Plotly.react('reportRssi',
        [{ x: xData, y: yRssi, type: 'scatter', name: 'RSSI' }],
        { ...layout, title: `${title} RSSI` }
    );
}

function drawGraphs() {
    setProgressBar(100, 'Starting...');
    xFreqData = []; ySnrData = []; yLmsnrData = []; yRssiData = [];
    resetLog();
    $('#tpList, #tpNum').html('');

    // Small delay so the progress bar renders before the fetch begins
    setTimeout(() => {
        const reportName = document.getElementById('dirList').value;
        returnReport(reportName)
            .then(() => dataToDrawCharts())
            .catch(err => {
                console.error('returnReport:', err);
                logElem('<div class="alert">Network Error!</div>');
            });
    }, 1000);
}

function dataToDrawCharts() {
    reportData.common_param.forEach(({ freq, sr, polarity, offset, nim_type, fec, mod, result, cnr, lm_cnr, rssi }) => {
        xFreqData.push(`${freq}MHz - Flow rate: ${sr} - Pol.: ${polarity} <br> Carrier offset: ${offset} - Broadcast standard: ${nim_type} - FEC: ${fec}<br> Signal mod.: ${mod} - Transponder test: ${result}`);
        ySnrData.push(cnr);
        yLmsnrData.push(lm_cnr);
        yRssiData.push(rssi);
    });

    satName = reportData.sat_name;
    updateChartCr(xFreqData, ySnrData, yLmsnrData, yRssiData, satName);
    logElem(`Date: ${reportData.date}`);

    const LNB_TYPES = { 0: 'standard', 1: 'custom', 2: 'universal' };
    const { type, low_freq, high_freq, tone } = reportData.lnb_info;
    const localOsc = low_freq === high_freq ? `${low_freq}` : `${low_freq} - ${high_freq}`;
    const dsq10    = reportData.lnb_info['dsq1.0_port'] || 'disabled';
    const dsq11    = reportData.lnb_info['dsq1.1_port'] || 'disabled';
    const toneStr  = tone === 0 ? 'off' : 'on';

    logResp(`Satellite position: ${reportData.sat_position} <br>
        Satellite name: ${satName} <br><br>
        Settings: <br>
        Converter type: ${LNB_TYPES[type] ?? type} <br>
        Frequency: ${localOsc} <br>
        DSQ1.0: ${dsq10} <br>
        DSQ1.1: ${dsq11} <br>
        Tone: ${toneStr}`);

    optionList('tpList', reportData);
}

// ── Log helpers ────────────────────────────────────────────────────────────────

function connMessage(msg) { connMessages.innerHTML  = `${msg}<br>`; }
function logElem(msg)     { logInfo.innerHTML       = `${msg}<br>`; }
function logResp(msg)     { logResponse.innerHTML   = `${msg}<br>`; }
function resetLog()       { logElem(''); logResp(''); }

// ── JSON export ────────────────────────────────────────────────────────────────

function buildExportName() {
    const { date, sat_position, sat_name } = reportData;
    return `${sat_position}_${sat_name}_${date.split(' ').join('_')}`;
}

function exportJson() {
    if (!Object.keys(reportData).length) {
        logElem('<div class="alert">No data available!</div>');
        return;
    }
    const href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData));
    const a    = Object.assign(document.createElement('a'), {
        href,
        download: `spectrum_${buildExportName()}.json`
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// ── JSON import ────────────────────────────────────────────────────────────────

const CR_REQUIRED_KEYS = [
    'date', 'version', 'sat_position', 'sat_name', 'tp_num',
    'lnb_info', 'lnb_3d', 'user', 'dish', 'stats', 'common_param',
    'spectrum_crc', 'spectrum_band_points', 'spectrum_data', 'ret_code'
];

function isValidCrJson(obj) {
    return CR_REQUIRED_KEYS.every(key => {
        const ok = key in obj;
        if (!ok) console.error(`Missing JSON key: ${key}`);
        return ok;
    });
}

function readSpectrumJson(file) {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
        const raw = reader.result;
        let parsed;
        try { parsed = JSON.parse(raw); } catch {
            logElem(`<div class="alert">The selected [${file.name}] is not valid JSON.</div>`);
            return;
        }
        if (!('common_param' in parsed) || !isValidCrJson(parsed)) {
            logElem(`<div class="alert">The selected [${file.name}] has an incorrect JSON structure.</div>`);
            return;
        }
        reportData = parsed;
        setProgressBar(100, file.name.slice(0, -5));
        xFreqData = []; ySnrData = []; yLmsnrData = []; yRssiData = [];
        resetLog();
        dataToDrawCharts();
    });
    reader.readAsText(file);
}

function loadCrJson() {
    const input = document.getElementById('fileinput-cr');
    input.value = '';

    const handleFile = file => {
        if (file.name.split('.').pop().toLowerCase() !== 'json') {
            logElem(`<div class="alert">Incorrect file extension: ${file.name}</div>`);
            return;
        }
        readSpectrumJson(file);
    };

    input.onchange = () => {
        if (input.files.length) handleFile(input.files[0]);
        else logElem('No JSON selected!');
    };
}

// ── Transponder quick-select (from report list → SNR view) ────────────────────

function applyTransponderFromReport(idx) {
    const tp      = reportData.common_param[idx];
    const lnb     = reportData.lnb_info;
    const freqLo  = tp.freq <= 11750 ? lnb.low_freq : lnb.high_freq;

    $('#freq_lo').val(freqLo);
    $('#sr').val(tp.sr);
    $('#pol').val(tp.polarity === 'H' ? 0 : 1);
    $('#tone').val(lnb.tone);
    $('#freq').val(tp.freq);

    if (lnb.type === 0) { $('#dmd').val(2); $('#modulation').val(256); }

    const dsqPort10 = lnb['dsq1.0_port'];
    const dsqPort11 = lnb['dsq1.1_port'];
    let dsq = '';
    if (dsqPort10) dsq = DSQ['1.0'][dsqPort10] ?? '';
    if (dsqPort11) dsq = DSQ['1.1'][dsqPort11] ?? '';
    $('#dsq').val(dsq);
}

// ── jQuery ready ───────────────────────────────────────────────────────────────

$(function () {
    resetLog();
    getVersion();

    $('#ipBtn').on('click', () => {
        saveIP(ipInput.value);
        getVersion();
    });

    $('#dirList').on('change', () => {
        initPlotCr();
        drawGraphs();
    });

    $('#createReportBtn').on('click', () => {
        setProgressBar(50, 'Report starting...');
        initPlotCr();
        resetLog();
        $('#fps, #status').text('');
        createReport();
    });

    $('#exportJsonBtn').on('click', exportJson);

    $('#tpList').on('change', function () {
        const idx = Number($(this).val()) - 1;
        $('.createReport, .initSmartSNR').toggle();
        Plotly.Plots.resize('snrChart');
        Plotly.Plots.resize('voltageChart');
        applyTransponderFromReport(idx);
    });

    $('.snrSpectSw').on('click', () => {
        $('.createReport, .initSmartSNR').toggle();
        Plotly.Plots.resize('snrChart');
        Plotly.Plots.resize('voltageChart');
    });

    $('#openCrJsonBtn').on('click', loadCrJson);
});
