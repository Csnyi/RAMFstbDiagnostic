chrome.action.onClicked.addListener((tab) => {
  chrome.windows.create({
    url: "html/main.html",
    type: "normal"
  });
});

