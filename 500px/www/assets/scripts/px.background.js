// Initiate the `px` Object.
var px = {};

px.bgWindow = window;

/**
 * Application launch listener.
 */
chrome.app.runtime.onLaunched.addListener(function() {
  // Create our index window.
  chrome.app.window.create(
    'index.html',
    {width: 1200, height: 800},
    function(indexWindow) {
      console.log('here');
      console.log(indexWindow);
      console.log(indexWindow.document);
      px.index = px.index || {};
      px.index.window = indexWindow.contentWindow;
      indexWindow.contentWindow.px = px;

      px.index.launch = new CustomEvent('px_index_launch');
      window.dispatchEvent(px.index.launch);

      // Get token from storage.
      chrome.storage.local.get(function(items) {
        px.api.token = items.px_api_token || null;
        px.api.token_secret = items.px_api_token_secret || null;
      });
    });
});

