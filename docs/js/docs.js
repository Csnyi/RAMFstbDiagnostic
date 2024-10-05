
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
        `Affectus, qui passio est, desinit esse passio simulatque eius claram et distinctam formamus ideam.
        Affectus, qui passio est, desinit esse passio simulatque eius claram et distinctam formamus ideam.
        Affectus, qui passio est, desinit esse passio simulatque eius claram et distinctam formamus ideam.
        Affectus, qui passio est, desinit esse passio simulatque eius claram et distinctam formamus ideam.`,
        `Affectus, qui passio est, desinit esse passio simulatque eius claram et distinctam formamus ideam.
        Affectus, qui passio est, desinit esse passio simulatque eius claram et distinctam formamus ideam.
        Affectus, qui passio est, desinit esse passio simulatque eius claram et distinctam formamus ideam.
        Affectus, qui passio est, desinit esse passio simulatque eius claram et distinctam formamus ideam.
        Affectus, qui passio est, desinit esse passio simulatque eius claram et distinctam formamus ideam.
        Affectus, qui passio est, desinit esse passio simulatque eius claram et distinctam formamus ideam.`
    ],
    imgDescript: [
        `I am lorem ipsum consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
        I am lorem ipsum consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
        I am lorem ipsum consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
        `I am lorem ipsum consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
        I am lorem ipsum consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
    ],
    galleryText:[
        `It's beautiful!`,
        `And amezing!1`,
        `And amezing!2`,
        `And amezing!3`,
        `And amezing!4`,
        `And amezing!5`,
        `And amezing!6`,
        `And amezing!7`
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