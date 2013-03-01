chrome.app.runtime.onLaunched.addListener(function() {
  var screenWidth = screen.availWidth;
  var screenHeight = screen.availHeight;
  var width = 500;
  var height = 300;

  chrome.app.window.create('index.html', {
    width: width,
    height: height,
    left: (screenWidth-width)/2,
    top: (screenHeight-height)/2
  });
});
