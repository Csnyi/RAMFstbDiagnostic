
// Modal Image Gallery
function modalImage(element) {
    document.getElementById("img01").src = element.src;
    document.getElementById("modal01").style.display = "block";
    var captionText = document.getElementById("caption");
    captionText.innerHTML = element.alt;
  }
  
// Used to toggle the menu on small screens when clicking on the menu button
function toggleFunction() {
    var x = document.getElementById("navDemo");
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
    } else {
        x.className = x.className.replace(" w3-show", "");
    }
} 

/** 
  * Add dynamic content
  */
// text content
var content = {
    manualText: [
        `R.A.M.F. Diagnostic is a Chrome browser extension for monitoring and diagnosing the Goldmaster SR-525HD satellite set-top box over a local network. 
        Once installed, enter the device's IP address in the connection field and press the Connection button. 
        The extension will establish communication with the device and unlock the available diagnostic features: Spectrum Report and SNR Measurement.`,

        `For a Spectrum Report, select a satellite from the list and click Create Report. 
        The extension will scan all configured transponders and display interactive CNR and RSSI charts powered by Plotly.js. 
        Results can be saved locally and reloaded at any time via the Export / Open JSON functions. 
        For SNR Measurement, switch to SNR mode, fill in the transponder parameters (frequency, symbol rate, polarization, LNB voltage, DiSEqC port), 
        and optionally set a measurement duration in minutes. 
        If no duration is set, the measurement runs continuously until you press Stop. 
        After measuring, export your data to JSON for later review or directly to an Excel file for further analysis.`
    ],
    imgDescript: [
        `The SR-525HD is a Goldmaster DVB-S2 satellite receiver with a built-in HTTP API, 
        allowing network-based diagnostics from any device on the same local network. 
        It supports DiSEqC 1.0 and 1.1, multi-satellite reception, and provides real-time signal parameters 
        including SNR, LNB current and voltage, lock status, and carrier offset.`,

        `R.A.M.F. Diagnostic communicates with the device through its public HTTP endpoint. 
        No additional software or firmware modification is required — the extension connects directly 
        to the receiver's built-in interface using standard fetch requests and Server-Sent Events (SSE) 
        for live data streaming.`
    ],
    galleryText:[
        `Home — report diagram`,
        `Satellite list`,
        `Report list`,
        `Transponder list`,
        `SNR parameters`,
        `Running report`,
        `Open JSON`,
        `Saved report view`
    ]
}

// location and storage of dynamic text
var dynamicContentManualText = document.getElementById('manualText');
var dynamicContentImgDescript = document.getElementById('imgDescript');
var dynamicContentGalleryText = document.querySelectorAll('.galleryText');
var dynamicParagraphs = []; // Contains dynamically added paragraphs

var dynamicContentDataManualText = content.manualText; 
var dynamicContentDataImgDescript = content.imgDescript; 
var dynamicContentDataGalleryText = content.galleryText;

// Adding paragraph
dynamicContentDataManualText.forEach(function(text) {
    var paragraph = document.createElement('p');
    paragraph.textContent = text;
    dynamicParagraphs.push(paragraph);
    dynamicContentManualText.appendChild(paragraph);
});

dynamicContentDataImgDescript.forEach(function(text) {
    var paragraph = document.createElement('p');
    paragraph.textContent = text;
    dynamicParagraphs.push(paragraph);
    dynamicContentImgDescript.appendChild(paragraph);
});

// in a loop, the first element of dynamicContentDataGalleryText is assigned to the first element of dynamicContentGalleryText
dynamicContentDataGalleryText.forEach(function(text, i=0) {
    var paragraph = document.createElement('p');
    paragraph.textContent = text;
    dynamicParagraphs.push(paragraph);
    dynamicContentGalleryText[i].appendChild(paragraph);
});


$(function () {

    $("#modal01").click(function () {
        $(this).hide();
    })

    $("#toggleFunctionBars").click(function (e) {
        e.preventDefault();
        toggleFunction();
    });

    $(".modalImage").click(function () {
        modalImage(this);
    });

    $(".toggleFunction").click(function () {
        toggleFunction();
    });

});
