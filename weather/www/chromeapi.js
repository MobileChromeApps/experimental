/*! Cordova for Chrome - v0.1.0 - 2012-11-01
* http://github.com/MobileChromeApps/
* Copyright (c) 2012 Google Inc.; Licensed MIT */

// Prefix file for Grunt build. Included before all modules, and sets them up.

(function() {
  if (window.chrome && chrome.mobile) {
    console.log('WARNING - chrome apis doubly included.');
    return;
  }

  var __modules = {};
  function define(name, fn) {
    if (__modules[name]) {
      console.log('WARNING - duplicate definition of module: ' + name);
      return;
    }
    __modules[name] = fn;
  }

  function unsupportedApi(name) {
    return function() {
      console.warn('API is not supported on mobile: ' + name);
    }
  }


// chrome.app.runtime

define('chrome.app.runtime', function(require, module, chrome) {
  chrome.app.runtime = {};

  var events = require('helpers.events');
  chrome.app.runtime.onLaunched = {};
  chrome.app.runtime.onLaunched.addListener = events.addListener('onLaunched');
  chrome.app.runtime.onLaunched.fire = events.fire('onLaunched');
});


define('chrome.app.window', function(require, module, chrome) {
  var mobile = require('chrome.mobile');
  var common = require('chrome.common');

  // The AppWindow created by chrome.app.window.create.
  var createdAppWindow = null;

  function AppWindow() {
    this.contentWindow = mobile.fgWindow;
    this.id = '';
  }
  AppWindow.prototype = {
    restore: unsupportedApi('AppWindow.restore'),
    moveTo: unsupportedApi('AppWindow.moveTo'),
    clearAttention: unsupportedApi('AppWindow.clearAttention'),
    minimize: unsupportedApi('AppWindow.minimize'),
    drawAttention: unsupportedApi('AppWindow.drawAttention'),
    focus: unsupportedApi('AppWindow.focus'),
    resizeTo: unsupportedApi('AppWindow.resizeTo'),
    maximize: unsupportedApi('AppWindow.maximize'),
    close: unsupportedApi('AppWindow.close')
  };

  chrome.app.window = {};
  chrome.app.window.create = function(filePath, options, callback) {
    if (createdAppWindow) {
      console.log('ERROR - chrome.app.window.create called multiple times. This is unsupported.');
      return;
    }
    createdAppWindow = new AppWindow();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filePath, true);
    var topDoc = mobile.fgWindow.document;
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        topDoc.open();
        var pageContent = xhr.responseText || 'Page load failed.';
        var headIndex = pageContent.indexOf('<head>');
        if (headIndex != -1) {
          common.windowCreateCallback = callback;
          var endIndex = headIndex + '<head>'.length;
          topDoc.write(pageContent.slice(0, endIndex));
          topDoc.write('<link rel="stylesheet" type="text/css" href="chromeappstyles.css">');
          // Set up the callback to be called before the page contents loads.
          if (callback) {
            common.createWindowCallback = callback;
            topDoc.write('<script>chrome.mobile.impl.createWindowHook()</script>');
          }
          topDoc.write(pageContent.slice(endIndex));
        } else {
          topDoc.write(pageContent);
          // Callback is called even when the URL is invalid.
          if (callback) {
            callback(createdAppWindow);
          }
        }
        topDoc.close();
      }
    };
    xhr.send();
  };

  chrome.app.window.current = function() {
    return window == mobile.fgWindow ? createdAppWindow : null;
  };
});

define('chrome.app', function(require, module, chrome) {
  chrome.app = {};
  require('chrome.app.runtime');
  require('chrome.app.window');
});

define('chrome.common', function(require, module) {
  module.exports.windowCreateCallback = null;
});

define('chrome.mobile', function(require, module, chrome) {
  var common = require('chrome.common');

  chrome.mobile = {};
  chrome.mobile.impl = {};
  chrome.mobile.impl.init = function(_fgWindow, _bgWindow) {
    module.exports.fgWindow = _fgWindow;
    module.exports.bgWindow = _bgWindow;
    module.exports.bgWindow.chrome = chrome;
  };

  chrome.mobile.impl.createWindowHook = function() {
    common.windowCreateCallback();
    common.windowCreateCallback = null;
  };
});

define('chrome.runtime', function(require, module, chrome) {
  if (!chrome.runtime) {
    chrome.runtime = {};
  }

  var events = require('helpers.events');
  chrome.runtime.onSuspend = {};

  chrome.runtime.onSuspend.fire = events.fire('onSuspend');

  // Uses a trampoline to bind the Cordova pause event on the first call.
  chrome.runtime.onSuspend.addListener = function(f) {
    window.document.addEventListener('pause', chrome.runtime.onSuspend.fire, false);
    var h = events.addListener('onSuspend');
    console.log('sub-handler type: ' + typeof h);
    chrome.runtime.onSuspend.addListener = h;
    chrome.runtime.onSuspend.addListener(f);
  };
});


define('chrome.storage', function(require, module, chrome) {
  chrome.storage = {};

  function StorageArea() {
  }

  StorageArea.prototype = {
      getBytesInUse: unsupportedApi('StorageArea.getBytesInUse')
  };

  StorageArea.prototype.clear = function(callback) {
    localStorage.clear();
    if (callback) {
      callback();
    }
  };
  
  StorageArea.prototype.set = function(items, callback) {
    for (var key in items) {
      localStorage.setItem(key, JSON.stringify(items[key]));
    }
    if (callback) {
      callback();
    }
  };
  
  StorageArea.prototype.remove = function(keys, callback) {
    if (typeof keys === 'string') {
      keys = [keys];
    }
    for (var key in keys) {
      localStorage.removeItem(key);
    }
    if (callback) {
      callback();
    }
  };

  StorageArea.prototype.get = function(items, callback) {
    if (typeof items === 'function') {
      callback = items;
      items = {};
      for (var i = 0; i < localStorage.length; i++) {
        items[localStorage.key(i)] = null;
      }
    } else if (typeof items === 'string') {
      items = { items: null };
    } else if (Object.prototype.toString.call(items) === '[object Array]') {
        var newItems = {};
        items.forEach(function(e) {
            newItems[e] = null;
        });
        items = newItems;
    }
    for (var key in items) {
      var item = localStorage.getItem(key);
      if (item != null) {
        items[key] = JSON.parse(item);
      }
    }
    if (callback) {
      callback(items);
    }
  };

  function StorageChange() {
      this.newValue = null;
      this.oldValue = null;
  }

  StorageChange.prototype = {
  };

  chrome.storage.local = new StorageArea();
  chrome.storage.local.QUOTA_BYTES = 5242880;

  chrome.storage.sync = new StorageArea();
  chrome.storage.sync.MAX_ITEMS = 512;
  chrome.storage.sync.MAX_WRITE_OPERATIONS_PER_HOUR = 1000;
  chrome.storage.sync.QUOTA_BYTES_PER_ITEM = 4096;
  chrome.storage.sync.MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE = 10;
  chrome.storage.sync.QUOTA_BYTES = 102400;

  var events = require('helpers.events');
  chrome.storage.onChanged = {}; // TODO(mmocny)
  chrome.storage.onChanged.addListener = events.addListener('onChanged');
  chrome.storage.onChanged.fire = events.fire('onChanged');
});

define('helpers.events', function(require, module) {

  var listeners = {};
  module.exports.addListener = function(name) {
    return function(f) {
      if(!listeners[name]) {
        listeners[name] = [f];
      } else {
        listeners[name].push(f);
      }
    };
  };

  module.exports.fire = function(name) {
    return function() {
      for (var i = 0; i < listeners[name].length; i++) {
        listeners[name][i]();
      }
    };
  };
});


// Main module: Master set-up of Chrome APIs.

define('chrome', function(require) {
  // API modules export functions that expect this value as an argument and populate it with their part of the API.
  require('chrome.app');
  require('chrome.runtime');
  require('chrome.storage');
});

// Concluding code for the APIs, with the implementation of require and inclusion of main.

var require = (function() {
  var resolving = {};

  return function require(target) {
    // Look up the module.
    var mod = __modules[target];
    if (!mod) {
      console.error('No such module: ' + target);
      return;
    }
    if (resolving[target]) {
      console.error('Circular require(): ' + target + ' included twice.');
      return;
    }

    if (typeof mod == 'function') {
      // Prevent circular requires.
      resolving[target] = true;

      // This layer of indirection is present so that the module code can change exports to point to something new, like a function.
      var module = {};
      module.exports = {};
      mod(require, module, window.chrome);
      __modules[target] = module;

      // No longer resolving this module.
      delete resolving[target];

      return module.exports;
      // Each module is a singleton run only once, and this allows static data.
      // Modules are passed an object they should treat as being the "chrome" object.
      // Currently this is literally window.chrome, but we can change that in future if necessary.
    } else if (typeof mod == 'object') {
      return mod.exports;
    } else {
      console.error('unsupported module type: ' + typeof mod);
    }
  };
})();

// Load the module 'chrome' to kick things off.
window.chrome = {};
require('chrome');

// Close the wrapping function and call it.
})();
