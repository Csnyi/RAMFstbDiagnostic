let eventSourceSnr;
let collectedData = {
    lock: [],
    carrier_offset: [],
    snr: [],
    lm_snr: [],
    lnb_voltage: [],
    psu_voltage: [],
    alfa: [],
    beta: [],
    gamma: [],
    lnb_current: []
};

let eventSourceSnrInterval;
let countResponse = 1;
let countWait = 1;
let fpsCounter = 0;
let tpData = '';
let startOn = false;
let firstPlotRelay = true;

/**
 * Function for SNR report request
 */
function initSmartSNR() {
  reset();
  var ip = localStorage.getItem("ip");
  var freq = Number(document.getElementById("freq").value);
  var freq_lo = Number(document.getElementById("freq_lo").value);
  var freq_if = (freq - freq_lo);
  var sr = Number(document.getElementById("sr").value);
  var pol = document.getElementById("pol").value;
  var tone = document.getElementById("tone").value;
  var dsq = document.getElementById("dsq").value;
  var slnbe = document.getElementById("slnbe").value;
  var dmd = document.getElementById("dmd").value;
  var modulation = document.getElementById("modulation").value;
  tpData = `${freq} ${pol==0?'H':'V'} ${sr}`;
  var url = new URL('http://' + ip + '/public');
  var params = {
    command: 'initSmartSNR',
    state: 'on',
    mode: 'snr',
    freq: freq_if,
    sr: sr,
    pol: pol,
    tone: tone,
    diseqc_hex: dsq,
    smart_lnb_enabled: slnbe
    //dmd: dmd,
    //modulation: modulation
  };
  if(dmd == 2){
    params.freq = (freq/1000);
    params.dmd = dmd;
    params.modulation = modulation;
  }
  url.search = new URLSearchParams(params).toString();
  fetch(url).then(response => {
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
  }).catch(error => {
    logError(`<div class="alert">Network Error!</div>`);
    eventSourceSnr.close();
    clearInterval(eventSourceSnrInterval);
    log("");
    console.log("initSNR: ", error);
  });
}

/**
 * when "Start" button pressed
 * EventSource handling
 */

function start() {

  if (eventSourceSnr) {
    eventSourceSnr.close();
    clearInterval(eventSourceSnrInterval);
  }

  resetDatabase();
  
  initSmartSNR();

  let ip = localStorage.getItem("ip");
  eventSourceSnr = new EventSource(`http://${ip}/public?command=startEvents`);

  eventSourceSnr.onerror = function(e) {
    if (this.readyState != eventSourceSnr.CONNECTING) {
      clearInterval(eventSourceSnrInterval);
      eventSourceSnr.close();
      logError(`<div class="alert">A connection error occurred.</div>`);
      console.log("EventSource Reconnection");
      setTimeout(() => start(), 1000);  
    }
  };
  
  if (eventSourceSnr.readyState == 0) {
    logError(`Connecting...`);
  }

  eventSourceSnr.addEventListener('update', function(e) { 
    let response = JSON.parse(e.data);
    if(response.ret_code == undefined){
      if (response.scan_status) {
        logError("Connection status: "+response.scan_status);
      }else{
        logError("Connection status: Locked");
      }
    }
    if (response.ret_code != null) {
      if ( response.ret_code == "KEY_PRESSED_ERR") logError("Busy by TV User");
      if ( response.ret_code == "ONE_CLIENT_ALLOWED_ERR") logError("Busy by APP User");
      if ( response.ret_code == "STB_BUSY_ERR") logError("Operation is not finished");
      if ( response.ret_code == "STREAMING_ERR") logError("Busy by IPTV User");
      eventSourceSnr.close();
      clearInterval(eventSourceSnrInterval);
    }
    for (let key in collectedData) {
      if (response[key] !== undefined) {
        collectedData[key].push(response[key]);
      }
    }
    if (response.tune_mode == 0) { 
        let rssi_dbuv;
        let dmd = $("#dmd").val();
        if (dmd == 0) {
            rssi_dbuv = (112 - +response.lpg / 100).toFixed(0);
        }
        else {
            rssi_dbuv = (+response.lpg + 107.5).toFixed(0);
        }
        $("#RSSI_dBuV").html(rssi_dbuv);
        //console.log(rssi_dbuv);
    }
    fpsCounter++;
    //log(`${e.data}`)
  });
  // Start interval timer to process data every second
  eventSourceSnrInterval = setInterval(processData, 1000);
}

/**
 * when "Stop" button pressed
 */  
function stop(streamedData) { 
  if (eventSourceSnr) {
    eventSourceSnr.close();
    clearInterval(eventSourceSnrInterval);
    $("#fpsSnr").html(0);
    $("#RSSI_dBuV").html(0);
    logError(`Request stopped!<br><br>
      Start: ${new Date(streamedData.timestamp[0]).toLocaleString()} <br>
      Stop: ${new Date(streamedData.timestamp[streamedData.timestamp.length-1]).toLocaleString()} <br>
    `);
  }
}

/**
 * when "Reset" button pressed
 */  
function reset() {
  initPlotSnr();
  logError("");
  log("");
  $("#fileName").html("");
  $("#progressText").html("");
  $("#fpsSnr").html(0);
  $("#RSSI_dBuV").html(0);
  collectedData = {
    lock: [],
    carrier_offset: [],
    snr: [],
    lm_snr: [],
    lnb_voltage: [],
    psu_voltage: [],
    alfa: [],
    beta: [],
    gamma: [],
    lnb_current: []
  };
  countResponse = 1;
  countWait = 1;
  fpsCounter = 0;
  tpData = '';
  firstPlotRelay = true;
}

/**
 * process for collected data in initSmartSNR function
 */
function processData() {
  if (collectedData.snr.length > 0) {
    $("#fpsSnr").html(fpsCounter);

    let infoLock = lockInfo(collectedData.lock);
    let avgCarrierOffset = average(collectedData.carrier_offset);
    let avgSnr = average(collectedData.snr);
    let avgLmSnr = average(collectedData.lm_snr);
    let avgLnbVoltage = average(collectedData.lnb_voltage, 0);
    let avgPsuVoltage = average(collectedData.psu_voltage, 0);
    let avgAlfa = average(collectedData.alfa);
    let avgBeta = average(collectedData.beta);
    let avgGamma = average(collectedData.gamma);
    let avgLnbCurrent = average(collectedData.lnb_current);
    
    //data to json end xlsx
    let timeStamp = new Date().getTime();

    let dataPerSec = {
        tpVal: tpData,
        timestamp: timeStamp,
        lock: average(collectedData.lock),
        carrier_offset: avgCarrierOffset,
        snr: avgSnr,
        lm_snr: avgLmSnr,
        lnb_voltage: avgLnbVoltage,
        psu_voltage: avgPsuVoltage,
        alfa: avgAlfa,
        beta: avgBeta,
        gamma: avgGamma,
        lnb_current: avgLnbCurrent
    };
    
    saveToIDB(dataPerSec);

    // set time of measure
    let setTime = document.getElementById("setTime").value;
    if (countResponse == setTime*60) {
      startOn = false;
      retrieveData().then(function(transformedData) {
        stop(transformedData);
      });
    }
   
    log(`<p>Processed Data: ${countResponse++} </p>
      <div class="warn"> Current data: <br>
      Alfa: ${avgAlfa}°, <br>
      Beta: ${avgBeta}°, <br>
      Gamma: ${avgGamma}°, <br>
      LNB Current: ${avgLnbCurrent} mA <br>
      Carrier Offset: ${(avgCarrierOffset/1000).toFixed(1)} MHz 
    </div>`);
    
    updateChartSnr(infoLock, avgSnr, avgLmSnr, avgLnbVoltage, avgPsuVoltage); // Update the chart with the new average values

    // Clear the collected data for the processed keys
    collectedData.lock = [];
    collectedData.carrier_offset = [];
    collectedData.snr = [];
    collectedData.lm_snr = [];
    collectedData.lnb_voltage = [];
    collectedData.psu_voltage = [];
    collectedData.alfa = [];
    collectedData.beta = [];
    collectedData.gamma = [];
    collectedData.lnb_current = [];
    fpsCounter = 0;
  } else {
    log(`Waiting for a response from the server. ${countWait++} sec`);
  }
}

function average(dataArray, n = 2) {
  let sum = dataArray.reduce((a, b) => a + b, 0);
  let avg = sum / dataArray.length;
  return parseFloat(avg.toFixed(n));
}

function lockInfo(infos) {
  let info = "";
  (average(infos) == 1) ? info = "Locked": info = "Not Locked";
  return info;
}

/**
 * Generate a name for download files
 * @returns date, frequency and polarity
 */
function nameGenerator(tpVal) {
  let d = new Date().toLocaleDateString();
  let dArr = d.split(". ");
  let dString = dArr.join("");
  let tpValArr = tpVal.split(" ");
  let tpValString = tpValArr.join("");
  let result = `${dString}${tpValString}`;
  return result;
}

/**
 *  Function to download collected data as JSON
 */
function downloadDataAsJSON() {
  retrieveData().then(function (storedData) {
    if ( storedData.tpVal.length == 0 ) {
       throw error = "Empty Storage!";
    }
    const keys = Object.keys(storedData);
    const length = storedData[keys[1]].length;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(storedData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    let namePartJson = nameGenerator(storedData.tpVal[0]);
    downloadAnchorNode.setAttribute("download", `snr${namePartJson}.json`);
    document.body.appendChild(downloadAnchorNode); // Required for FF
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }).catch(function (error) {
    logError(`<div class="alert">No data available! ${error} </div>`);
  });
}

/**
 * Function to convert JSON data to Excel and download
 */ 
function downloadDataAsExcel() {
  retrieveData().then(function (storedData) {
    if ( storedData.tpVal.length == 0 ) {
       throw error = "Empty Storage!";
    }
    const keys = Object.keys(storedData);
    const length = storedData[keys[1]].length; 
    const dataArray = [];
    for (let i = 0; i < length; i++) {
      const row = {};
      keys.forEach(key => {
        row[key] = storedData[key][i];
      });
      dataArray.push(row);
    }
    // Create a worksheet and a workbook
    const ws = XLSX.utils.json_to_sheet(dataArray);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    // Write the workbook and trigger the download
    let namePartXlsx = nameGenerator(storedData.tpVal[0]);
    XLSX.writeFile(wb, `snr${namePartXlsx}.xlsx`);
  }).catch(function (error) {
    logError(`<div class="alert">No data available! ${error}</div>`);
  });
}

function log(msg) {
  let logElem = document.getElementById('logElem');
  logElem.innerHTML = msg + '<br>';
}

function logError(msg) {
  let errorElem = document.getElementById('errorElem');
  errorElem.innerHTML = msg + '<br>';
}

/**
 * update the graph with data every second 
 * @param {string} infoLock - Text converted from the lock value, which can be "1" or "0".
 * @param {number} avgSnr 
 * @param {number} avgLmSnr 
 * @param {number} avgLnbVoltage 
 * @param {number} avgPsuVoltage 
 */
function updateChartSnr(infoLock, avgSnr, avgLmSnr, avgLnbVoltage, avgPsuVoltage) {
  const now = new Date();
  const nowZone = now.getTimezoneOffset();
  const timeLine = new Date(now.getTime()-(nowZone*60*1000)).toISOString(); // Use toISOString for time label
  const timeLabel = `${timeLine} - ${tpData} - ${infoLock}`; 

  Plotly.extendTraces('snrChart', {
    x: [[timeLabel], [timeLabel]],
    y: [[avgSnr], [avgLmSnr]]
  }, [0, 1]);

  Plotly.extendTraces('voltageChart', {
    x: [[timeLabel], [timeLabel]],
    y: [[avgLnbVoltage], [avgPsuVoltage]]
  }, [0, 1])

  if (firstPlotRelay){
    Plotly.relayout('snrChart', {
      'xaxis.autorange': true, 
      'yaxis.autorange': true, 
      "hovermode": 'x unified'
    });
    Plotly.relayout('voltageChart', {
      'xaxis.autorange': true, 
      'yaxis.autorange': true,  
      "hovermode": 'x unified'
    });
    firstPlotRelay = false;
  };
}

/**
 * Initialize the chart
 */
function initPlotSnr() {
  const commonData = { x: [], y: [], type: 'scatter' };

  const snrData = [
    { ...commonData, name: 'SNR' },
    { ...commonData, name: 'LM SNR' }
  ];

  const voltageData = [
    { ...commonData, name: 'LNB Voltage' },
    { ...commonData, name: 'PSU Voltage' }
  ];

  const commonLayout = {
    xaxis: { title: 'Time', type: 'category', autorange: true },
    yaxis: { title: 'Value',  autorange: true }
  };

  const commonConfig = { displaylogo: false, responsive: true };

  Plotly.newPlot('snrChart', snrData, {
    ...commonLayout, 
    title: "Signal-to-noise ratio" 
  }, commonConfig);

  Plotly.newPlot('voltageChart', voltageData, {
    ...commonLayout, 
    title: "Voltages" 
  }, commonConfig);
}

$(function () {

  reset();
  
  // handling buttons
  $("#startLink").click(function () {
    startOn = true;
    start();
  });

  $("#stopLink").click(function () {
    if (startOn) {
      startOn = false;
      retrieveData().then(function(transformedData) {
          stop(transformedData);
      }).catch(function (error) {
          stop();
          console.log("stopLink: ", error);
      });
    }
  });

  $("#resetLink").click(function () {
    if (startOn) return;
    reset();
  });

  $("#lastDataLink").click(function () {
    if (startOn) return;
    reset();
    retrieveData().then(function (data) {
      if (data.tpVal.length > 0) {
        modalLoaderOn();
        setTimeout(function () {
          streamedDataProcess(data, "Stored Data");
        }, 0)
      }else{
        modalLoaderOff();
        logError(`<div class="alert">No data available!</div>`);
      }
    }).catch(function (error) {
      modalLoaderOff();
      console.log("lastdataLink: ", error);
      logError(`<div class="alert">No data available!</div>`);
    });
  });

  $("#toJsonLink").click(function () {
    if (startOn) return;
    downloadDataAsJSON();
  });

  $("#toXlsxLink").click(function () {
    if (startOn) return;
    downloadDataAsExcel();
  });

  $("#openSnrJsonBtn").click(function (e) {
      if (startOn) {
          e.preventDefault(); 
      }else{
          reset();
          loadSnrJson();
      }
  });

});
