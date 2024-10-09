$(function(){
    // Get the modal
    var modals = document.querySelectorAll(".modal");
    var modalScan = document.querySelector('.modal-scan');
    // Get the button that opens the modal
    var btns = document.querySelectorAll(".modalBtn");
    
    // Get the <span> element that closes the modal
    var spans = document.querySelectorAll(".close");
  
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

    function modalScanOn() {
      modalScan.style.display = "block";
    }
    window.modalScanOn = modalScanOn;

    function modalScanOff() {
      modalScan.style.display = "none";
    }
    window.modalScanOff = modalScanOff;

});