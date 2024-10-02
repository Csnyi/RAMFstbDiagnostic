/** JSON read */

// check JSON
function checkLock(text) {
    const regex = /lock/gi;
    return regex.test(text);
}

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

function readJson() {
    const [file] = document.getElementById('fileinput-snr').files;
    const reader = new FileReader(); 
    if (file) {
        reader.readAsText(file);
    };
    var fileName = file.name;

    $("#fileName").html(`<div class="success text-center">View - ${fileName}</div>`);

    reader.addEventListener("load", () => {

        var response = reader.result;
        var jsonValid = checkJSONForm(response);
        var containsLock = checkLock(response);
        if (!containsLock || !jsonValid) {
            logError(`<div class="alert">The selected <span style="cursor: default;" title="${fileName}">[file]</span> has an incorrect JSON for this.</div>`);
            return;
        };
        var allData = JSON.parse(response);
        var validJsonKeys = validateJsonKey(allData);
        if (!validJsonKeys) {
            logError(`<div class="alert">The selected <span style="cursor: default;" title="${fileName}">[file]</span> has an incorrect JSON for this.</div>`);
            return;
        };

        // data processing

        updateChartJson(allData);

        let detailsAlfa = detailsData(allData.alfa, '°');
        let detailsBeta = detailsData(allData.beta, '°');
        let detailsGamma = detailsData(allData.gamma, '°');
        let detailsLock = allData.lock.map(e=>(e==1)?e='Locked':e='Not locked');
        let detailsLnb = detailsData(allData.lnb_current, ' mA');
        let CarrOffMega = allData.carrier_offset.map(e=>(e/1000));
        let detailsCarrOff = detailsData(CarrOffMega, ' MHz');

        log(`<div class="content"> 
            Data: ${allData.alfa.length} <br>
            From: ${new Date(allData.timestamp[0]).toLocaleString()} <br>
            To: ${new Date(allData.timestamp[allData.timestamp.length-1]).toLocaleString()} <br><br>
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
        
        logError(`Processing of the file is complete! <br>
            <div class="success">Transponder: ${allData.tpVal[0]}</div>
        `);

        toggleModal();

    }, false); 
};

function detailsData(arr, unit) {
    let response = [];
    arr.forEach(e => response.push(`${e.toFixed(2)}${unit}`));
    return response
}

// datatables
var infoTables = [];

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
}

// modal handling
function toggleModal(){
    // Get the modal
    var modals = document.querySelectorAll(".modalDt");
    // Get the button that opens the modal
    var btns = document.querySelectorAll(".modalBtnDt");
    // Get the <span> element that closes the modal
    var spans = document.querySelectorAll(".closeDt");
  
    // Set up event listener for 'esc' key press
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape") {
        for (let i = 0; i < modals.length; i++) {
          let modal = modals[i];
          if (modal.style.display === "block") {
            modal.style.display = "none";
            break; // Exit loop once modal is closed
          }
        }
      }
    });
  
    document.addEventListener("click", function(event) {
      
      for (let i = 0; i<modals.length; i++){
        let modal = modals[i];
        let btn = btns[i];
        let span = spans[i];
    
        // When the user clicks on the button, open the modal 
        if(event.target == btn) {
          modal.style.display = "block";
        }
    
        // When the user clicks on <span> (x), close the modal
        if(event.target == span) {
          modal.style.display = "none";
        }

        // Set up a single event listener for clicks outside modals
        if (event.target == modal) {
          modal.style.display = "none";
        }

      }

    });
}

/** load Chart */
// Convert timestamps to local time strings

let timeZone = new Date().getTimezoneOffset();

function convertTimestamps(timestamps, tpval, lock) {
    let lockLine = lock.map(e => (e === 1) ? 'Locked' : 'Not locked');
    let timeLine = timestamps.map(ts => new Date(ts-(timeZone*60*1000)).toISOString());
    return timeLine.map((value, index) => `${value} - ${tpval[index]} - ${lockLine[index]}`);
}
  
  // Update the charts with new data
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
        }
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
        }
    });
}


let fileInputSnr = document.getElementById("fileinput-snr");

fileInputSnr.addEventListener("click", function () {
    reset();
    if (fileInputSnr.files.length > 0) {
        handleFile(fileInputSnr.files[0]);
    }
});

fileInputSnr.addEventListener("change", function () {
    reset();
    if (fileInputSnr.files.length > 0) {
        handleFile(fileInputSnr.files[0]);
    } else {
        logError("No JSON selected!");
    }
});

function handleFile(myFile) {
    var fileName = myFile.name;
    var fileExtension = fileName.split('.').pop().toLowerCase();
    if (fileExtension === 'json') {
        readJson();
    } else {
        logError(`<div class="alert">The selected <span style="cursor: default;" title="${fileName}">[file]</span> has an incorrect extension.</div>`);
    }
}

