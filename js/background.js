chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.windows.create({
      url: "html/main.html",
      type: "normal"
    });
  });
