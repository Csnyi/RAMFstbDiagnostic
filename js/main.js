if($(".createReport").hide()){

  // defined global variables =============================================================
let satList = [];
let reportList = [];
let reportListNew = [];
let reportData = [];
let snrData = [];
let xFreqData = [];
let ySnrData = [];
let yLmsnrData = [];
let yRssiData = [];
let connMessages = document.getElementById('connMessage');
let logInfo = document.getElementById('logInfo');
let logResponse = document.getElementById('response');
let satName = "";
let eventSource;
let reportInProgress;
let newName;
const dsqObj = {
    dsq10_port: {
        "1": "E01038F0",
        "2": "E01038F4",
        "3": "E01038F8",
        "4": "E01038FC"
    },
    dsq11_port: {
        "1": "E01039F0",
        "2": "E01039F1",
        "3": "E01039F2",
        "4": "E01039F3",
        "5": "E01039F4",
        "6": "E01039F5",
        "7": "E01039F6",
        "8": "E01039F7",
        "9": "E01039F8",
        "10": "E01039F9",
        "11": "E01039FA",
        "12": "E01039FB",
        "13": "E01039FC",
        "14": "E01039FD",
        "15": "E01039FE",
        "16": "E01039FF"
    }
}


// progress bar handling ================================================================
let progressBarConn = document.getElementById("conn-progress-bar");
let progressBar = document.getElementById("progress-bar");
let progressBarScan = document.getElementById("progress-bar-scan");

/** Message to the user with the progress bar */
const setProgressBarConn = (width, message) => {
  progressBarConn.style.background = "#5f9ea0";
  progressBarConn.textContent = message;
  progressBarConn.style.width = width + '%';
};

const setProgressBarConnWait = (width, message) => {
  progressBarConn.style.background = "#5f9ea0";
  progressBarConn.textContent = message;
  let progBarMove = setInterval(function () {
    progressBarConn.style.width = width + '%';
    width += 1;
    if (width == 90 || $("#status").html() == "Connected"){
      clearInterval(progBarMove);
    }
  }, 30);
}

const setProgressBar = (width, message) => {
  progressBar.style.background = "#5f9ea0";
  progressBar.style.width = width + '%';
  progressBar.textContent = message; 
};

const setProgressBarErr = (width, message) => {
  progressBar.style.background = "#a05f5f";
  progressBar.style.width = width + '%';
  progressBar.textContent = message; 
};

// Validate IP input, set localStorage [$('#ip').change()] ==============================
var ipInput = document.getElementById("ip");
ipInput.value = localStorage.getItem("ip");

/** IP address verification with regexp. */
function isValidIP(ip) {
  // Regex pattern
  var ipPattern = /^(25[0-5]|2[0-4]\d|[01]?\d{1,2})(\.(25[0-5]|2[0-4]\d|[01]?\d{1,2})){3}$/;
  // We check the IP address using the pattern
  return ipPattern.test(ip);
}

// connect EventSource ==================================================================
var millisec = Date.now();
var firstStart = true;
var fpsCounterId;
var counter = 0, cntDelta, localCounter = 0;
localStorage['fps_counter'] = 0;

/** Check the connection. */
function getVersion() {
  connMessage('');
  if (localStorage['ip'] != undefined) {

    setProgressBarConn(50, 'Connecting...');
    setTimeout(function(){
      setProgressBarConnWait(50, "Waiting for STB.");
    }, 1000);

    let urlVersion = "http://" + localStorage['ip'] + "/public?command=version";
    fetch(urlVersion)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response is not correct.');
        }
        return response.json();
      })
      .then(data => {
        //clearInterval(connectId);
        console.log('getVersion:', data);
        resetLog();
        $("#fps").html(localStorage.getItem("fps_counter"));
        $("#status").html("Connected");
        $(".conn").toggle();
        $(".createReport").toggle();
        // chart initialisation
        initPlot();
        // load Satellite list and Report list
        returnSatList();
        // report list and drow graphs when load page
        getReportList()
          .then(() => {
            drawGraphs();
          })
          .catch(err => {
            console.error('getReportList:', err);
            logElem(`<div class="alert">Connection Error!</div>`);
          });

      })
      .catch(error => {
        console.error('getVersion: ', error);
        reportData = [];
        connMessage(`<div class="alert">Network Error!</div>`);
        setProgressBarConn(100, "Try again later!");
      });
  }else{
    reportData = [];
    connMessage(`<div class="alert">Missing IP!</div>`);
    setProgressBarConn(100, "Enter the IP address of the STB!");
  }
  
}

/** managing the different ways to EventSource */
function startEventSource(url) {
    if (eventSource) {
      eventSource.close();
      clearInterval(fpsCounterId);
    }
    
    if (localStorage['ip'] != undefined) {
        if (url == undefined) url = 'http://' + localStorage['ip'] + '/public?command=startEvents';
        eventSource = new EventSource(url);
        eventSource.onerror = function (e) {
            if (this.readyState == EventSource.CONNECTING) {
                console.log("Reconnecting (readyState=${this.readyState})...");
            }
            else {
                console.log("Error has occured. ");
                clearInterval(fpsCounterId);
                setTimeout(startEventSource, 500);
            }
        };
        eventSource.addEventListener('update', function (e) {
            counter++;
            // console.log(e.data);
            response = JSON.parse(e.data);
                // status check 
                console.log("ret_code", response.ret_code);
                if (response.status_code == "SYS_NOT_STARTED_ERR") {
                    stopEvent("SYS_NOT_STARTED_ERR");
                    resetLog();
                    let url = "http://" + localStorage['ip'] + "/public?command=commonEvent";
                    fetch(url)
                      .then(response => {
                          if (!response.ok) {
                              throw new Error('Network response is not correct.');
                          }
                          return response.json();
                      })
                      .then(data => {
                          console.log('commonEvent:', data);
                          // EventSource start
                          startEventSource();
                      })
                      .catch(error => {
                          console.error('commonEvent: ' + error);
                      });
                }
                if (response.ret_code == undefined && $("#status").html() != "Connected") {
                    $("#status").html("Connected");
                }
                else if (response.ret_code != null) {
                    if ( response.ret_code == "KEY_PRESSED_ERR") logElem("Busy by TV User");
                    if ( response.ret_code == "ONE_CLIENT_ALLOWED_ERR") logElem("Busy by APP User");
                    if ( response.ret_code == "STB_BUSY_ERR") logElem("Operation is not finished");
                    if ( response.ret_code == "STREAMING_ERR") logElem("Busy by IPTV User");
                    stopEvent();
                    setTimeout(function () {
                    let url = "http://" + localStorage['ip'] + "/public?command=updateSNRAndAxis";
                        startEventSource(url);
                    }, 500);
                }
                //-----------------------------------------------------------------------
                // SNR
                if (response.tune_mode == 0) { 

                }
                //-----------------------------------------------------------------------
                // report generation
                if (response.tune_mode == 2){
                  //console.log(response.scan_progress);
                    if (response.scan_progress < 100) {
                      reportInProgress = true;
                      modalScanOn();
                      disablePageRefresh();
                      $("#checkStatus").html("All transponder signal check");
                      progressBarScan.style.width = response.scan_progress + '%';
                      progressBarScan.textContent = response.scan_progress + '%';
                      log('The report is being created.');
                    }
          
                    if( response.scan_progress >= 100 ){
                      reportComplete();
                      modalScanOff();
                      stopEvent();
                      xFreqData = [];
                      ySnrData = [];
                      yLmsnrData = [];
                      yRssiData = [];
                      getLastReport().then((result) => {
                        if(result){
                        returnReport(result)
                          .then(() => {
                              dataToDrawCharts();
                          })
                          .catch(err => {
                            logElem('returnReport: ' + err);
                            console.error('returnReport: ', err);
                          });
                        }
                      }).catch(err => {
                        logElem('Error loading last report:', err);
                      });
                    };
                }
                
                //-----------------------------------------------------------------------
                // blindscan
                if (response.tune_mode == 3) { 

                }
                //-----------------------------------------------------------------------
                // standard events
                if (response.tune_mode == 7) { 
                    console.log("restart");
                    stopEvent("The report has stopped!");
                    reportComplete();
                    modalScanOff();
                }
        });
        fpsCounterId = setInterval(function () {
            realDelay = Date.now() - millisec;
            cntDelta = counter - localCounter;
            cntDelta = (cntDelta / realDelay) * 1000;
            cntDelta = cntDelta.toFixed(0);
            millisec = Date.now();
            localCounter = counter;
            localStorage['fps_counter'] = cntDelta;
            $("#fps").html(cntDelta);
        }, 1000);
    }
}

/** Stops the EventSource. */
function stopEvent(mess = '') {
    if (eventSource != undefined && eventSource.close != undefined) {
        eventSource.close();
    }
    clearInterval(fpsCounterId);
    localStorage['fps_counter'] = 0;
    $("#fps").html(localStorage.getItem("fps_counter"));
    setProgressBar(100, mess);
}

// stop refress page ====================================================================

function disablePageRefresh() {
    window.onkeydown = function(event) {
      event.preventDefault();
    };

    window.onbeforeunload = function(event) {
        if (reportInProgress) {
            event.preventDefault(); 
            event.returnValue = 'The process is ongoing, are you sure you want to leave the site?';
        }
    };
}

function reportComplete() {
    reportInProgress = false;
    window.onkeydown = null;
    window.onbeforeunload = null;
}



// report generation ====================================================================

/** Sends the createReport request to the STB. */
function createReport(){
    var ip = localStorage.getItem("ip");
    var satId = document.getElementById("satList").value;
    let url = new URL(`http://${ip}/public?command=createReport&sat_id=${satId}`); 
    fetch(url).then(response => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      }).then(data => {
          console.log('Successful setting:', data);
          logElem(`The report has been started!`);
          startEventSource();
      }).catch(error => {
          console.error("createReport: ", error);
          logElem(`<div class="alert">Network Error!</div>`);
          setProgressBarErr(100, "Connection Error!")
          reportData = [];
      });
}

/** Sends the initSmartSNR request to the STB.   */
function initSmartSNR(){
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
    mode: 'snr',
    freq: freq_if,
    sr: sr,
    pol: pol,
    tone: tone,
    diseqc_hex: dsq,
    smart_lnb_enabled: slnbe
  };
  url.search = new URLSearchParams(params).toString();

    fetch(url).then(response => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      }).then(data => {
          console.log('Successful setting:', data);
          logElem(`The report has been started!`);
          startEventSource();
      }).catch(error => {
          console.error("createReport: ", error);
          logElem(`<div class="alert">Network Error!</div>`);
          setProgressBarErr(100, "Connection Error!")
          snrData = [];
      });
};

// reportList and reportListNew and the difference, get lastReportName

function dirListDifference(array1, array2) {
  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    throw new TypeError("Both arguments should be arrays");
  }

  function objectExistsInArray(obj, array) {
    return array.some(item => item.name === obj.name && item.size === obj.size);
  }

  const difference1 = array1.filter(element => !objectExistsInArray(element, array2));
  const difference2 = array2.filter(element => !objectExistsInArray(element, array1));
  const difference = difference1.concat(difference2);

  return difference;
}

/** Transcribes the report name into a more readable form. */
function newReportName(name) {
  newName = name;
  if (name.indexOf('stb_ethalon_rpt_') == 0) {
      newName = name.replace('stb_ethalon_rpt_', 'Ref.room');
      newName = newName.slice(0, -4);
  }
  if (name.indexOf('dish_ethalon_rpt_') == 0) {
      newName = name.replace('dish_ethalon_rpt_', 'Ref.dish');
      newName = newName.slice(0, -4);
  }
  if (name.indexOf('rpt_') == 0) {
      newName = name.replace('rpt_', 'Reg');
      if (newName.includes('E_') == true) newName = newName.replace('E_', 'E.');
      if (newName.includes('W_') == true) newName = newName.replace('W_', 'W.');
      newName = newName.replace('-', '.');
      newName = newName.replace('-', '.');
      newName = newName.split('_');
      if (newName[1].includes('E.') == true) {
          newName[1] = newName[1].split('E.');
          newName[1][0] = (newName[1][0] / 10).toFixed(1);
          newName[1] = newName[1].join('E.');
      }
      if (newName[1].includes('W.') == true) {
          newName[1] = newName[1].split('W.');
          newName[1][0] = (newName[1][0] / 10).toFixed(1);
          newName[1] = newName[1].join('W.');
      }
      newName[2] = newName[2] + ':' + newName[3];
      newName = newName.slice(0, -2);
      newName = newName.join(' ');
      if (newName.includes('0.0W') == true) newName = newName.replace('0.0W', 'Terr');
      if (newName.includes('9.1E') == true) newName = newName.replace('9.1E', 'Cab');
  }
  return newName;
}

/** Production of the lists. */
const optionList = (selectId, list) => {
  let sel = document.getElementById(selectId);
  sel.innerHTML = "";
  switch (selectId) {
    case "dirList":
      let sortList = list.dir_list.sort( function (a, b){
          if (a.name < b.name) {
              return -1;
          }
          if (a.name > b.name) {
              return 1;
          }
          return 0;
      });
      sortList.forEach(item => {
        let option = document.createElement('option');
        option.value = item.name.slice(0, -4);
        option.innerHTML = newReportName(item.name);
        sel.appendChild(option);
      });
      break;
    case "satList":
      for (var i = 0; i < list.sat_num; i++) {
        let option = document.createElement('option');
        option.value = list.sat_list[i].sat_id;
        option.innerHTML = list.sat_list[i].sat_degree.padStart(5, "0") + list.sat_list[i].direction + ' ' + list.sat_list[i].sat_name;
        sel.appendChild(option);
      }
      break;
    case "tpList":
      for (var i = 0; i < list.tp_num; i++) {
        let option = document.createElement('option');
        option.value = list.common_param[i].idx;
        option.innerHTML = list.common_param[i].freq + " " + list.common_param[i].polarity + " " + list.common_param[i].sr;
        sel.appendChild(option);
      }
      break;
  }
}

async function getReportList() {
    let ip = localStorage.getItem("ip");
    let url = new URL(`http://${ip}/mnt/flash/e/ls.json`);

    try {
        let response = await fetch(url);

        if (!response.ok) {
        logElem(`<div class="alert">Error ${response.status}: ${response.statusText}</div>`);
        setProgressBar(50, 'Failed');
        return;
        }

        reportList = await response.json();

        optionList("dirList", reportList);
        setProgressBar(100, 'I am ready! And you...?');
      
    } catch (error) {
        logElem(`<div class="alert">Request failed!</div>`);
        setProgressBar(50, 'Failed');
        throw error;        
    }

}

async function getLastReport() {
    let ip = localStorage.getItem("ip");
    let url = new URL(`http://${ip}/mnt/flash/e/ls.json`);

    try {
        let response = await fetch(url);

        if (!response.ok) {
        logElem(`<div class="alert">Error ${response.status}: ${response.statusText}</div>`);
        return;
        }

        reportListNew = await response.json();
        optionList("dirList", reportListNew);

        const arr1 = reportList.dir_list;
        const arr2 = reportListNew.dir_list;
        reportList = reportListNew;
        let lastReport = dirListDifference(arr1, arr2);
        if (lastReport[lastReport.length-1] != undefined) {
            let lastReportName = lastReport[lastReport.length-1].name.slice(0,-4);
            return lastReportName;
        }

    } catch (error) {
        logElem(`<div class="alert">Request failed!</div>`);
        console.error("getLastReport: ", error);
    }
}

// Asynchronous function to retrieve the report
async function returnReport(reportName) {
    let ip = localStorage.getItem("ip");
    let url = new URL(`http://${ip}/public?command=returnReport&report_name=e:/${reportName}.json`);

    try {
        let response = await fetch(url);

        if (!response.ok) {
        logElem(`<div class="alert">Error ${response.status}: ${response.statusText}</div>`);
        setProgressBar(100, 'Failed');
        return;
        }

        // Parse and return JSON data
        reportData = await response.json();

        // Automatically updates the progress bar to 100% when fetching completes
        setProgressBar(100, `${newReportName(reportName.concat("abcd"))}`);

    } catch (err) {
        logElem(`<div class="alert">Request failed!</div>`);
        setProgressBar(100, 'Failed');
        throw err;
    }
}

// charts
function initPlot() {
    Plotly.newPlot('reportCnr', [{
        x: [],
        y: [],
        type: 'scatter',
        name: 'CNR'
    }, {
        x: [],
        y: [],
        type: 'scatter',
        name: 'LM CNR'
    }], {
        title: "CNR report",
        xaxis: {
          title: 'Transponder',
          type: 'category', 
          autorange: true 
        },
        yaxis: {
          title: 'Values',
          autorange: true 
        }
    }, {
        displaylogo: false,
        responsive: true
    });

    Plotly.newPlot('reportRssi', [{
        x: [],
        y: [],
        type: 'scatter',
        name: 'RSSI'
    }], {
        title: "RSSI report",
        xaxis: {
          title: 'Transponder',
          type: 'category', 
          autorange: true 
        },
        yaxis: {
          title: 'Values',
          autorange: true 
        }
    }, {
        displaylogo: false,
        responsive: true
    });
}

function updateChart(xFreqData, ySnrData, yLmsnrData, yRssiData, satName) {
  
    Plotly.react('reportCnr', [{
        x: xFreqData,
        y: ySnrData,
        type: 'scatter',
        name: 'CNR'
    }, {
        x: xFreqData,
        y: yLmsnrData,
        type: 'scatter',
        name: 'LM CNR'
    }], {
        title: satName + ' CNR',
        xaxis: {
            title: 'Transponder',
            type: 'category',
            autorange: true
        },
        yaxis: {
            title: 'Values',
            autorange: true
        }
    });

    Plotly.react('reportRssi', [{
        x: xFreqData,
        y: yRssiData,
        type: 'scatter',
        name: 'RSSI'
    }], {
        title: satName + ' RSSI',
        xaxis: {
            title: 'Transponder',
            type: 'category',
            autorange: true
        },
        yaxis: {
            title: 'Values',
            autorange: true
        }
    });
}

function drawGraphs() {
    setProgressBar(100, 'Starting...');
    xFreqData = [];
    ySnrData = [];
    yLmsnrData = [];
    yRssiData = [];
    resetLog();
    setTimeout(() => {
        let reportName = document.getElementById("dirList").value;
        returnReport(reportName)
            .then(() => {
              dataToDrawCharts();
              optionList("tpList", reportData);
            })
            .catch(err => {
              console.error('returnReport:', err);
              logElem(`<div class="alert">Network Error!</div>`);
            });
    }, 1000); // Delay to start the progress bar immediately.
}

function dataToDrawCharts() {
    reportData.common_param.forEach(e => xFreqData.push(`${e.freq}MHz - Flow rate: ${e.sr} - Pol.: ${e.polarity} <br> Broadcast standard: ${e.nim_type} - FEC: ${e.fec}<br> Signal mod.: ${e.mod} - Transponder test: ${e.result}`));
    reportData.common_param.forEach(e => ySnrData.push(e.cnr));
    reportData.common_param.forEach(e => yLmsnrData.push(e.lm_cnr));
    reportData.common_param.forEach(e => yRssiData.push(e.rssi));
    satName = reportData.sat_name;
    updateChart(xFreqData, ySnrData, yLmsnrData, yRssiData, satName);
    logElem("Date: " + reportData.date);
    let convType = reportData.lnb_info.type;
    if (convType == 0) convType = 'standard';
    if (convType == 1) convType = 'custom';
    if (convType == 2) convType = 'universal';
    let lowFreq = reportData.lnb_info.low_freq;
    let highFreq = reportData.lnb_info.high_freq;
    let localOsc = '';
    if (lowFreq == highFreq) localOsc = `${lowFreq}`;
    if (lowFreq != highFreq) localOsc = `${lowFreq} - ${highFreq}`;
    let dsq10 = reportData.lnb_info['dsq1.0_port'];
    if (dsq10 == 0) dsq10 = 'disabled';
    let dsq11 = reportData.lnb_info['dsq1.1_port'];
    if (dsq11 == 0) dsq11 = 'disabled';
    let tone = reportData.lnb_info.tone;
    (tone == 0) ? tone = 'off' : tone = 'on';
    log(`Satellite position: ${reportData.sat_position} <br> 
        Satellite name: ${satName} <br> <br>
        Settings: <br>
        Converter type: ${convType} <br>
        Frequency: ${localOsc} <br>
        DSQ1.0: ${dsq10} <br>
        DSQ1.1: ${dsq11} <br>
        Tone: ${tone}
      `);
}

// information handling
function connMessage(msg) {
  connMessages.innerHTML = msg + '<br>';
}

function logElem(msg) {
  logInfo.innerHTML = msg + '<br>';
}

function log(msg) {
  logResponse.innerHTML = msg + '<br>';
}

// satellite list
function returnSatList(){
    var ip = localStorage.getItem("ip");
    let url = new URL(`http://${ip}/public?command=returnSATList`);

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
      })
      .then(function (result) {
        optionList("satList", result);
      })
      .catch(function(error) {
        console.error('returnSatList: ', error);
        logElem(`<div class="alert">Network error!</div>`);
      });
}

// check and read JSON

function checkLock(text) {
  const regex = /common_param/gi;
  return regex.test(text);
}

function validateJsonKey(jsonObj) {
  const requiredKeys = ['date', 'version', 'sat_position', 'sat_name', 'tp_num', 'lnb_info', 'lnb_3d', 'user', 'dish', 'stats', 'common_param', 'spectrum_crc', 'spectrum_band_points', 'spectrum_data', 'ret_code'];

  for (let key of requiredKeys) {
      if (!(key in jsonObj)) {
          console.error("Missing required JSON key!");
          return false;
      }
  }
  return true; // All necessary members can be found and are of type number
}

function checkJSONForm(response) {
  try {
      JSON.parse(response); 
      console.log('The file is valid JSON.');
      return true; 
  } catch (error) {
      console.error('The file is not valid JSON:', error.message);
      return false; 
  }
}

function readSpectrumJson() {
  const [file] = document.getElementById('fileinput-cr').files;
  const reader = new FileReader(); 
  if (file) {
      reader.readAsText(file);
  };
  var fileName = file.name;

  reader.addEventListener("load", () => {

      var response = reader.result;
      var jsonValid = checkJSONForm(response);
      var containsLock = checkLock(response);
      if (!containsLock || !jsonValid) {
          logElem(`<div class="alert">The selected <span style="cursor: default;" title="${fileName}">[file]</span> has an incorrect JSON for this.</div>`);
          return;
      };
      reportData = JSON.parse(response);
      var validJsonKeys = validateJsonKey(reportData);
      if (!validJsonKeys) {
          logElem(`<div class="alert">The selected <span style="cursor: default;" title="${fileName}">[file]</span> has an incorrect JSON for this.</div>`);
          return;
      };

      // data processing

      setProgressBar(100, `${fileName.slice(0, -5)}`);
      xFreqData = [];
      ySnrData = [];
      yLmsnrData = [];
      yRssiData = [];
      resetLog();
      dataToDrawCharts();
      optionList("tpList", reportData);

  }, false); 
};

function resetLog() {
  logElem("");
  log("");
}

// exportJson: function to download collected data as JSON

function jsonName() {
  let d = reportData.date;
  let dArr = d.split(".");
  let dString = "";
  dArr.forEach(e => dString += e);
  dString = dString.slice(0, -6);
  let pString = reportData.sat_position;
  let nString = reportData.sat_name;
  let result = `${pString}_${nString}_${dString}`;
  return result;
}

function exportJson() {
  const keys = Object.keys(reportData);
  if ( keys.length > 0) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    let plusName = jsonName();
    downloadAnchorNode.setAttribute("download", `spectrum_${plusName}.json`);
    document.body.appendChild(downloadAnchorNode); // Required for FF
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }else{
    logElem(`<div class="alert">No data available!</div>`);
  } 
}

// Json load handling

let fileInput = document.getElementById("fileinput-cr");

fileInput.addEventListener("click", function () {
  initPlot();
  resetLog();
  if (fileInput.files.length > 0) {
    handleFile(fileInput.files[0]);
  }
});

fileInput.addEventListener("change", function () {
  initPlot();
  resetLog();
  if (fileInput.files.length > 0) {
    handleFile(fileInput.files[0]);
  } else {
    logElem("No JSON selected!");
  }
});

function handleFile(myFile) {
  var fileName = myFile.name;
  var fileExtension = fileName.split('.').pop().toLowerCase();
  if (fileExtension === 'json') {
    readSpectrumJson();
  } else {
    logElem(`<div class="alert">The selected <span style="cursor: default;" title="${fileName}">[file]</span> has an incorrect extension.</div>`);
  }
}

// after the page has loaded

$(function(){

    resetLog();
    getVersion();

    $('#ipBtn').click(function () {
        initPlot();
        resetLog();
        $('#fps').html('');
        $('#status').html('');        
        var ipValid = isValidIP(ipInput.value);
        ipValid ? localStorage.setItem("ip", ipInput.value): alert("Invalid IP: "+ ipInput.value +"!");
        ipInput.value = localStorage.getItem("ip");
        getVersion();
    })
    // Event listener for the dir_list
    $("#dirList").change(function() {
        initPlot();
        resetLog();
        drawGraphs();
    });

    $("#createReportBtn").click(function(){
        setProgressBar(50, 'Report starting...');
        initPlot();
        resetLog();
        $("#fps").html('');
        $("#status").html('');
        createReport();
    });

    $("#exportJsonBtn").click(function() {
        exportJson();
    });
    
    $("#tpList").change(function(){
        $(".createReport, .initSmartSNR").toggle();
        let id = $(this).children("option:selected").val();
        let idx = id - 1;
        $("#freq").val(reportData.common_param[idx].freq);
        $("#sr").val(reportData.common_param[idx].sr);
        let freq_lo = 0;
        if(reportData.common_param[idx].freq <= 11750){
          freq_lo = reportData.lnb_info.low_freq;
        }else{
          freq_lo = reportData.lnb_info.high_freq;
        };
        $("#freq_lo").val(freq_lo);
        let pol = 0;
        if(reportData.common_param[idx].polarity == "H"){
          pol = 0;
        }else{
          pol = 1;
        }
        $("#pol").val(pol);
        $("#tone").val(reportData.lnb_info.tone);
        let dsq = 0;
        if(reportData.lnb_info["dsq1.0_port"] != 0){
          let dsqId = reportData.lnb_info["dsq1.0_port"];
          dsq = dsqObj.dsq10_port[dsqId];
        }
        if(reportData.lnb_info["dsq1.1_port"] != 0){
          let dsqId = reportData.lnb_info["dsq1.1_port"];
          dsq = dsqObj.dsq11_port[dsqId];
        }
        $("#dsq").val(dsq);
    });

    $(".snrSpectSw").click(function () {
        $(".createReport, .initSmartSNR").toggle();
    });

});

}