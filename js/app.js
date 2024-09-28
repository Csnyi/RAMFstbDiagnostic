let eventSource;
let collectedData = {
    lock: [],
    snr: [],
    lm_snr: [],
    lnb_voltage: [],
    psu_voltage: [],
    alfa: [],
    beta: [],
    gamma: [],
    lnb_current: []
};
let streamedData = {
    tpVal: "",
    timestamp: [],
    lock: [],
    snr: [],
    lm_snr: [],
    lnb_voltage: [],
    psu_voltage: [],
    alfa: [],
    beta: [],
    gamma: [],
    lnb_current: []
};
let eventSourceInterval;
let blindMess = "";
let countResponse = 1;
let countWait = 1;
let fpsCounter = 0;
let tpData = '';

// IP input container
var ipContent = document.getElementById("ip");
ipContent.addEventListener("change", function(){
  reset();
  var ipValid = isValidIP(ipContent.value);
  !ipValid ? alert("Invalid IP: "+ ipContent.value +"!"): localStorage.setItem("ip", ipContent.value);
}); 
ipContent.value = localStorage.getItem("ip");

function isValidIP(ip) {
  // Regex pattern
  var ipPattern = /^(25[0-5]|2[0-4]\d|[01]?\d{1,2})(\.(25[0-5]|2[0-4]\d|[01]?\d{1,2})){3}$/;
  // We check the IP address using the pattern
  return ipPattern.test(ip);
}

function initSmartSNR(mode) {
  var ip = localStorage.getItem("ip");
  var freq = Number(document.getElementById("freq").value);
  var freq_lo = document.getElementById("freq_lo").value;
  var freq_if = (freq - freq_lo);
  var sr = Number(document.getElementById("sr").value);
  var pol = document.getElementById("pol").value;
  var tone = document.getElementById("tone").value;
  var dsq = document.getElementById("dsq").value;
  var slnbe = document.getElementById("slnbe").value;
  tpData = `${freq} ${pol==0?'H':'V'} ${sr}`;
  var url = new URL('http://' + ip + '/public');
  var params = {
    command: 'initSmartSNR',
    state: 'on',
    mode: mode,
    freq: freq_if,
    sr: sr,
    pol: pol,
    tone: tone,
    diseqc_hex: dsq,
    smart_lnb_enabled: slnbe
  };
  url.search = new URLSearchParams(params).toString();
  xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.send();
  xhr.onerror = function() { 
    logError(`<div class="alert">Network Error!</div>`);
    clearInterval(eventSourceInterval);
    log("");
  };
}

// when "Start" button pressed

function start(mode) {
  if (eventSource) {
    eventSource.close();
    clearInterval(eventSourceInterval);
  }

  reset();

  initSmartSNR(mode);

  streamedData.tpVal = tpData; 

  let ip = localStorage.getItem("ip");
  eventSource = new EventSource(`http://${ip}/public?command=startEvents`);

  eventSource.onerror = function(e) {
    if (this.readyState != EventSource.CONNECTING) {
      clearInterval(eventSourceInterval);
      logError(`<div class="alert">A connection error occurred.</div>`);
      eventSource.close(); 
      log("Reconnection");
      setTimeout(() => start(), 1000);  
    }
  };
  
  if (eventSource.readyState == 0) {
    logError(`Connecting...`);
  }

  eventSource.addEventListener('update', function(e) { 
    let response = JSON.parse(e.data);
    if(response.ret_code == undefined){
      if (response.scan_status) {
        logError("Connection status: "+response.scan_status);
      }
      else if (response.blind_scan_progress) {
        if (response.blind_scan_progress == 0) {
            blindMess = "Frequency found";
        }else if (response.blind_scan_progress == 1) {
            blindMess = "Signal locked.";
        }else if (response.blind_scan_progress == 2) {
            blindMess = "Signal not locked!";
        }else if (response.blind_scan_progress == 3) {
            blindMess = "Started.";
        }else if (response.blind_scan_progress == 4) {
            blindMess = "The blindscan is done.";
        }else if (response.blind_scan_progress == 6) {
            blindMess = "Search interrupted!";
        }
        logError(blindMess);
      }else{
        logError("Connection status: Locked");
      }
    }
    if (response.ret_code != null) {
      clearInterval(eventSourceInterval);
      if ( response.ret_code == "KEY_PRESSED_ERR") logError("Busy by TV User");
      if ( response.ret_code == "ONE_CLIENT_ALLOWED_ERR") logError("Busy by APP User");
      if ( response.ret_code == "STB_BUSY_ERR") logError("Operation is not finished");
      if ( response.ret_code == "STREAMING_ERR") logError("Busy by IPTV User");
      eventSource.close();
    }
    //-----------------------------------------------------------------------
    // initSmart SNR mode
    if (response.tune_mode == 0) { 
      for (let key in collectedData) {
        if (response[key] !== undefined) {
          collectedData[key].push(response[key]);
        }
      }
    }
    
    fpsCounter++;
    //-----------------------------------------------------------------------
    // initSmart blindscan mode
    if (response.tune_mode == 3) { 
        if (response.blind_scan_progress == 4) {
            eventSource.close();
            clearInterval(eventSourceInterval);
            $("#fpsSnr").html(0);
            //log(JSON.stringify(response));
            let tpList = "<br>The frequency is an intermediate frequency<br>";
            for (let i=0; i<response.tp_num; i++){
                tpList += "<br>" + (i+1) + " Frequency: " + response.tp_list[i].rf_frequency;
                tpList += " sr: " + response.tp_list[i].tp_sr;
            }
            log("Found tp number: " + response.tp_num + tpList);
        }
    }
  });
  // Start interval timer to process data every second
  eventSourceInterval = setInterval(processData, 1000);
}

// when "Stop" button pressed
function stop() { 
  if (eventSource == undefined) {
     logError(`<p class="warn">No request!</p>`);
  }

  if (eventSource.readyState == 2) {
    if (streamedData.timestamp.length > 0) {  
      logError(`Request stopped!<br><br>
        Start: ${new Date(streamedData.timestamp[0]).toLocaleString()} <br>
        Stop: ${new Date(streamedData.timestamp[streamedData.timestamp.length-1]).toLocaleString()} <br>
      `);
    }else{
      logError(`<p class="warn">No request!</p>`);
    }
  }

  if (eventSource.readyState == 1) {
    eventSource.close();
    clearInterval(eventSourceInterval);
    $("#fpsSnr").html(0);
    logError(`Request stopped!<br><br>
      Start: ${new Date(streamedData.timestamp[0]).toLocaleString()} <br>
      Stop: ${new Date(streamedData.timestamp[streamedData.timestamp.length-1]).toLocaleString()} <br>
    `);
  }

}

// when "Reset" button pressed
function reset() {
  initPlot();
  logError("");
  log("");
  $("#fileName").html("");
  $("#fpsSnr").html(0);
  collectedData = {
    lock: [],
    snr: [],
    lm_snr: [],
    lnb_voltage: [],
    psu_voltage: [],
    alfa: [],
    beta: [],
    gamma: [],
    lnb_current: []
  };
  streamedData = {
    tpVal: "",
    timestamp: [],
    lock: [],
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
}

function processData() {
  if (collectedData.snr.length > 0) {
    $("#fpsSnr").html(fpsCounter);

    let infoLock = lockInfo(collectedData.lock);
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
    streamedData.timestamp.push(timeStamp);
    streamedData.lock.push(average(collectedData.lock));
    streamedData.snr.push(avgSnr);
    streamedData.lm_snr.push(avgLmSnr);
    streamedData.lnb_voltage.push(avgLnbVoltage);
    streamedData.psu_voltage.push(avgPsuVoltage);
    streamedData.alfa.push(avgAlfa);
    streamedData.beta.push(avgBeta);
    streamedData.gamma.push(avgGamma);
    streamedData.lnb_current.push(avgLnbCurrent);

    // set time of measure
    let setTime = document.getElementById("setTime").value;
    if (countResponse == setTime*60) {
      stop();
    }
   
    log(`<p>Processed Data: ${countResponse++} </p>
      <div class="warn"> Current data: <br>
      Alfa: ${avgAlfa}°, <br>
      Beta: ${avgBeta}°, <br>
      Gamma: ${avgGamma}°, <br>
      LNB Current: ${avgLnbCurrent} mA 
    </div>`);
    
    updateChart(infoLock, avgSnr, avgLmSnr, avgLnbVoltage, avgPsuVoltage); // Update the chart with the new average values

    // Clear the collected data for the processed keys
    collectedData.lock = [];
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

function nameGenerator() {
  let d = new Date().toLocaleDateString();
  let dArr = d.split(". ");
  let dString = "";
  dArr.forEach(e => dString += e);
  dString = dString.slice(0, -1);
  let fString = Number($("#freq").val());
  let srString = Number($("#sr").val());
  let pString = $("#pol").val();
  let result = `${dString}_${fString}${pString==0?'H':'V'}${srString}`;
  return result;
}

// Function to download collected data as JSON
function downloadDataAsJSON() {
  const keys = Object.keys(streamedData);
  const length = streamedData[keys[1]].length;
  console.log(streamedData[keys[1]]);
  if (length > 0) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(streamedData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    let namePartJson = nameGenerator();
    downloadAnchorNode.setAttribute("download", `snr_${namePartJson}.json`);
    document.body.appendChild(downloadAnchorNode); // Required for FF
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }else{
    logError(`<div class="alert">No data available!</div>`);
  }
}

// Function to convert JSON data to Excel and download
function downloadDataAsExcel() {
  const keys = Object.keys(streamedData);
  const length = streamedData[keys[1]].length; 
  if (length > 0) {  
    const dataArray = [];
    for (let i = 0; i < length; i++) {
      const row = {};
      keys.forEach(key => {
        row[key] = streamedData[key][i];
      });
      dataArray.push(row);
    }
    // Create a worksheet and a workbook
    const ws = XLSX.utils.json_to_sheet(dataArray);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    // Write the workbook and trigger the download
    let namePartXlsx = nameGenerator();
    XLSX.writeFile(wb, `snr_${namePartXlsx}.xlsx`);
  }else{
    logError(`<div class="alert">No data available!</div>`)
  }
}

function log(msg) {
  let logElem = document.getElementById('logElem');
  logElem.innerHTML = msg + '<br>';
}

function logError(msg) {
  let logElem = document.getElementById('errorElem');
  logElem.innerHTML = msg + '<br>';
}

// update the graph with data every second 
function updateChart(infoLock, avgSnr, avgLmSnr, avgLnbVoltage, avgPsuVoltage) {
  const now = new Date();
  const nowZone = now.getTimezoneOffset();
  const timeLine = new Date(now.getTime()-(nowZone*60*1000)).toISOString(); // Use toISOString for time label
  const timeLabel = `${timeLine} - ${tpData} - ${infoLock}`; 

  Plotly.extendTraces('snrChart', {
    x: [[timeLabel], [timeLabel]],
    y: [[avgSnr], [avgLmSnr]]
  }, [0, 1]);

  // Automatically adjust the x-axis and y-axis ranges
  Plotly.relayout('snrChart', {
    'xaxis.autorange': true, // Automatically adjust the x-axis range
    'yaxis.autorange': true  // Automatically adjust the y-axis range
  });

  Plotly.extendTraces('voltageChart', {
    x: [[timeLabel], [timeLabel]],
    y: [[avgLnbVoltage], [avgPsuVoltage]]
  }, [0, 1]);

  // Automatically adjust the x-axis and y-axis ranges
  Plotly.relayout('voltageChart', {
    'xaxis.autorange': true, // Automatically adjust the x-axis range
    'yaxis.autorange': true  // Automatically adjust the y-axis range
  });
}

// Initialize the chart
function initPlot() {
  Plotly.newPlot('snrChart', [{
    x: [],
    y: [],
    type: 'scatter',
    name: 'SNR'
  }, {
    x: [],
    y: [],
    type: 'scatter',
    name: 'LM SNR'
  }], {
    title: "Signal-to-noise ratio",
    xaxis: {
      title: 'Time',
      type: 'category', // Change to 'category' to handle local time strings
      autorange: true // Automatically adjust the x-axis range on new data
    },
    yaxis: {
      title: 'Value',
      autorange: true // Automatically adjust the y-axis range on new data
    }
  }, {
    displaylogo: false,
    responsive: true
  });
  Plotly.newPlot('voltageChart', [{
    x: [],
    y: [],
    type: 'scatter',
    name: 'LNB Voltage'
  }, {
    x: [],
    y: [],
    type: 'scatter',
    name: 'PSU Voltage'
  }], {
    title: "Voltages",
    xaxis: {
      title: 'Time',
      type: 'category', // Change to 'category' to handle local time strings
      autorange: true // Automatically adjust the x-axis range on new data
    },
    yaxis: {
      title: 'Value',
      autorange: true // Automatically adjust the y-axis range on new data
    }
  }, {
    displaylogo: false,
    responsive: true
  });
};

// jQuery

$(function () {

  reset();

  // Initialize the chart when the page loads
  initPlot();

  // handling modal
  toggleModal();

  // handling buttons
  $("#startBlindLink").click(function(){
    start('blindscan');
  });

  $("#startSnrLink").click(function () {
    start('snr');
  });

  $("#stopSnrLink").click(function () {
    stop();
  });

  $("#resetLink").click(function () {
    reset();
  });

  $("#toJsonLink").click(function () {
    downloadDataAsJSON();
  });

  $("#toXlsxLink").click(function () {
    downloadDataAsExcel();
  });

});
