var actions = null;

function arrayBufferToString(ab) {
  return String.fromCharCode.apply(null, new Uint8Array(ab));
}

function sendCommand(command) {
  command = command.replace(/(^\s+|\s+$)/g, '');
  if (!actions || !actions.hasOwnProperty(command)) {
    console.warn('Cannot do that: \'' + command + '\'');
    console.warn(actions);
    return;
  }
  actions[command]();
}

function addrPortToString(addr, port) {
  return '[' + addr + ':' + port + ']';
}

function disconnectAndDestroy(socketId) {
  chrome.socket.getInfo(socketId, function(info) {
    if (info.connected) {
      chrome.socket.disconnect(socketId);
    }
    chrome.socket.destroy(socketId);
  });
}

function startReading(socketId) {
  chrome.socket.getInfo(socketId, function(info) {
    console.log('waiting for input from ' + addrPortToString(info.peerAddress, info.peerPort));
  });
  chrome.socket.read(socketId, function(readInfo) {
    if (readInfo.resultCode <= 0) {
      console.warn('failed to read, with error: ' + readInfo.resultCode);
      return disconnectAndDestroy(socketId);
    }
    sendCommand(arrayBufferToString(readInfo.data));
    startReading(socketId);
  });
}

function startAccepting(socketId) {
  chrome.socket.getInfo(socketId, function(info) {
    console.log('waiting for connection on ' + addrPortToString(info.localAddress, info.localPort));
  });
  chrome.socket.accept(socketId, function(acceptInfo) {
    if (acceptInfo.socketId <= 0) {
      console.warn('failed to accept, with error: ' + acceptInfo.socketId);
      return chrome.socket.destroy(socketId);
    }
    startAccepting(socketId);
    startReading(acceptInfo.socketId);
  });
}

function startController(addr, port) {
  chrome.socket.create('tcp', function(createInfo) {
    chrome.socket.listen(createInfo.socketId, addr, port, function(listenResult) {
      if (!!listenResult) {
        console.warn('failed to listen on ' + addrPortToString(addr, port) + ', with error: ' + listenResult);
        return disconnectAndDestroy(createInfo.socketId);
      }
      startAccepting(createInfo.socketId);
    });
  });
}

function initController(_actions) {
  var ADDR = '0.0.0.0';
  var PORT = 2000;

  actions = _actions;

  chrome.socket.getNetworkList(function(info) {
    info.forEach(function(e,i) {
      if (e.address.indexOf(':') < 0) {
        ADDR = e.address;
      }
    });

    startController(ADDR, PORT);
  });
}
