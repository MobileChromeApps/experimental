chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('echo_mco.html', {
    id: "test",
    width: 680,
    height: 480
  });
});
