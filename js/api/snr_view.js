/* JSON read */

/**
 * Check JSON
*/
function checkLock(text) {
    const regex = /lock/gi;
    return regex.test(text);
}

/**
 * Check JSON keys
 */
function validateJsonKey(jsonObj) {
    const requiredKeys = ["lock", "snr", "lm_snr", "alfa", "beta", "gamma", "lnb_current", "lnb_voltage", "psu_voltage", "timestamp"];

    for (let key of requiredKeys) {
        if (!(key in jsonObj)) {
            console.error("Missing required JSON key!");
            return false;
        }
        for (let value of jsonObj[key]) {
            if (typeof value !== 'number') {
                console.error("Array contains non-number value");
                return false;
            }
        }
    }
    return true; // All necessary members can be found and are of type number
}

/**
 * Check json format
 */
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

/**
 * Read json file and data processing
 */
function readJson(file) {
    const reader = new FileReader();
    if (!file) return;
    var fileName = file.name;
    $("#fileName").html(`<div class="success text-center">View - ${fileName}</div>`);
    reader.addEventListener("load", (e) => {
        const response = e.target.result;
        if (!checkLock(response) || !checkJSONForm(response)) {
            logError(`<div class="alert">The selected <span style="cursor: default;" title="${fileName}">[file]</span> has an incorrect JSON for this.</div>`);
            return;
        }

        var allData = JSON.parse(response);
        if (!validateJsonKey(allData)) {
            logError(`<div class="alert">The selected <span style="cursor: default;" title="${fileName}">[file]</span> has an incorrect JSON for this.</div>`);
            return;
        }
        streamedDataProcess(allData, "JSON Data");
    });
    reader.readAsText(file); 
}

/**
 * Formating the data details
 */
function detailsData(arr, unit) {
    let response = [];
    arr.forEach(e => response.push(`${e.toFixed(2)}${unit}`));
    return response
}

/** 
 * Data processing to streamed data 
 */
function streamedDataProcess(allData, headText) {

    updateChartJson(allData);

    let detailsAlfa = detailsData(allData.alfa, '°');
    let detailsBeta = detailsData(allData.beta, '°');
    let detailsGamma = detailsData(allData.gamma, '°');
    let detailsLock = allData.lock.map(e => (e == 1) ? e = 'Locked' : e = 'Not locked');
    let detailsLnb = detailsData(allData.lnb_current, ' mA');
    let CarrOffMega = allData.carrier_offset.map(e => (e / 1000));
    let detailsCarrOff = detailsData(CarrOffMega, ' MHz');

    log(`<div class="content"> 
        Data: ${allData.alfa.length} <br>
        From: ${new Date(allData.timestamp[0]).toLocaleString()} <br>
        To: ${new Date(allData.timestamp[allData.timestamp.length - 1]).toLocaleString()} <br><br>
        <div class="menu">
          <ul>
            <li class="modalBtnDt" id="modalBtnAlfa">Alfa: ${allData.alfa[0]}°</li>
              <!-- The Modal -->
              <div id="trunkModalAlfa" class="modalDt">
                <!-- Modal content -->
                <div class="modal-content">
                <span class="closeDt">&times;</span>
                <h3>Alfa:</h3>
                <table id="datalist0" class="display datalist" style="width:100%"></table>
                </div>
              </div>
            <li class="modalBtnDt" id="modalBtnBeta">Beta: ${allData.beta[0]}°</li>
              <!-- The Modal -->
              <div id="trunkModalBeta" class="modalDt">
                <!-- Modal content -->
                <div class="modal-content">
                <span class="closeDt">&times;</span>
                <h3>Beta:</h3>
                <table id="datalist1" class="display datalist" style="width:100%"></table>
                </div>
              </div>
            <li class="modalBtnDt" id="modalBtnGamma">Gamma: ${allData.gamma[0]}°</li>
              <!-- The Modal -->
              <div id="trunkModalGamma" class="modalDt">
                <!-- Modal content -->
                <div class="modal-content">
                <span class="closeDt">&times;</span>
                <h3>Gamma:</h3>
                <table id="datalist2" class="display datalist" style="width:100%"></table>
                </div>
              </div>
            <li class="modalBtnDt" id="modalBtnLock">Lock: ${detailsLock[0]}</li>
              <!-- The Modal -->
              <div id="trunkModalLock" class="modalDt">
                <!-- Modal content -->
                <div class="modal-content">
                <span class="closeDt">&times;</span>
                <h3>Lock:</h3>
                <table id="datalist3" class="display datalist" style="width:100%"></table>
                </div>
              </div>
            <li class="modalBtnDt" id="modalBtnLnb">LNB Current: ${allData.lnb_current[0]} mA</li>
              <!-- The Modal -->
              <div id="trunkModalLnb" class="modalDt">
                <!-- Modal content -->
                <div class="modal-content">
                <span class="closeDt">&times;</span>
                <h3>LNB current:</h3>
                <table id="datalist4" class="display datalist" style="width:100%"></table>
                </div>
              </div>
            <li class="modalBtnDt" id="modalBtnCo">Carrier offset: ${CarrOffMega[0].toFixed(2)} MHz</li>
              <!-- The Modal -->
              <div id="trunkModalCo" class="modalDt">
                <!-- Modal content -->
                <div class="modal-content">
                <span class="closeDt">&times;</span>
                <h3>Carrier offset:</h3>
                <table id="datalist5" class="display datalist" style="width:100%"></table>
                </div>
              </div>
          </ul>
        </div>
      </div>`);

    const dataSets = [detailsAlfa, detailsBeta, detailsGamma, detailsLock, detailsLnb, detailsCarrOff];
    const dataSet = dataSets.map(data => data.map((value, index) => [value, new Date(allData.timestamp[index]).toLocaleString()]));

    initDataTables(dataSet);

    logError(`${headText} <br>
              <div class="success">Transponder: ${allData.tpVal[0]}</div>
          `);

    toggleModal(".modalDt", ".modalBtnDt", ".closeDt");
};

/* datatables hendling */
var infoTables = [];

/**
 * datatables initialization
 */
function initDataTables(dataSet) {
  var tables = document.querySelectorAll(".datalist");
  for (let i = 0; i < infoTables.length; i++)  {
      if (infoTables[i]) {
        infoTables[i].destroy();
      } 
  }
  for (let i = 0; i < tables.length; i++) {
      var infoTable = $(tables[i]).DataTable({
          destroy: true,
          columns: [
              { title: 'Value:' },
              { title: 'Time:' }
          ],
          data: dataSet[i],
          retrieve: true
      });
      infoTables.push(infoTable);
  }
  modalLoaderOff();
}

/* load Chart */

let timeZone = new Date().getTimezoneOffset();

/**
 * Convert timestamps to local time strings
 */
function convertTimestamps(timestamps, tpval, lock) {
    let lockLine = lock.map(e => (e === 1) ? 'Locked' : 'Not locked');
    let timeLine = timestamps.map(ts => new Date(ts-(timeZone*60*1000)).toISOString());
    return timeLine.map((value, index) => `${value} - ${tpval[index]} - ${lockLine[index]}`);
}
  
/**
 * Update the charts with new data
 */ 
function updateChartJson(data) {
    let timeLabels = convertTimestamps(data.timestamp, data.tpVal, data.lock);
  
    // Update SNR chart
    Plotly.react('snrChart', [{
        x: timeLabels,
        y: data.snr,
        type: 'scatter',
        name: 'SNR'
    }, {
        x: timeLabels,
        y: data.lm_snr,
        type: 'scatter',
        name: 'LM SNR'
    }], {
        title: "Signal-to-noise ratio",
        xaxis: {
            title: 'Time',
            type: 'category',
            autorange: true
        },
        yaxis: {
            title: 'Value',
            autorange: true
        },
        hovermode: 'x unified'
    });

    // Update Voltage chart
    Plotly.react('voltageChart', [{
        x: timeLabels,
        y: data.lnb_voltage,
        type: 'scatter',
        name: 'LNB Voltage'
    }, {
        x: timeLabels,
        y: data.psu_voltage,
        type: 'scatter',
        name: 'PSU Voltage'
    }], {
        title: "Voltages",
        xaxis: {
            title: 'Time',
            type: 'category',
            autorange: true
        },
        yaxis: {
            title: 'Value',
            autorange: true
        },
        hovermode: 'x unified'
    });
}

/**
 * Load function for fileinput when it was click or change on selection.
 */
function loadSnrJson() {

    let fileInputSnr = document.getElementById("fileinput-snr");

    fileInputSnr.addEventListener("change", function () {
        if (fileInputSnr.files.length > 0) {
            modalLoaderOn();
            handleFile(fileInputSnr.files[0]);
        } else {
            console.log("Cancel button was clicked, no file selected.");
            logError("No JSON selected!");
        }
    });

    function handleFile(myFile) {
        var fileName = myFile.name;
        var fileExtension = fileName.split('.').pop().toLowerCase();
        var fileType = myFile.type;
        if (fileExtension === 'json'|| fileType === 'application/json') {
            readJson(myFile);
        } else {
            logError(`<div class="alert">The selected <span style="cursor: default;" title="${fileName}">[file]</span> has an incorrect extension.</div>`);
        }
    }

}


