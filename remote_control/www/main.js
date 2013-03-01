var connectedSocketId = null;

function sendCommand(str) {
  if (!connectedSocketId) {
    console.warn('connect first, then send commands');
  }
  var arr = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  console.log(arr);
  chrome.socket.write(connectedSocketId, arr.buffer, function(writeResult) {
    if (writeResult.bytesWritten < 0) {
      console.warn('failed to write, with error: ' + writeResult.bytesWritten);
      disconnectAndDestroy(connectedSocketId);
      connectedSocketId = null;
      return;
    }
  });
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

function startControlling(addr, port) {
  if (connectedSocketId) {
    chrome.socket.disconnect(connectedSocketId);
    chrome.socket.destroy(connectedSocketId);
    connectedSocketId = null;
  }
  chrome.socket.create('tcp', function(createInfo) {
    chrome.socket.connect(createInfo.socketId, addr, port, function(connectResult) {
      if (!!connectResult) {
        console.warn('failed to connect to ' + addrPortToString(addr, port) + ', with error: ' + connectResult);
        return disconnectAndDestroy(createInfo.socketId);
      }
      connectedSocketId = createInfo.socketId;
    });
  });
}

function initHandlers() {
  document.querySelector('#connect').onclick = function() {
    var addr = document.querySelector('#addr').value;
    startControlling(addr, 2000);
  };

  document.querySelector('#prev').onclick = function() {
    sendCommand('prev');
  };

  document.querySelector('#next').onclick = function() {
    sendCommand('next');
  };
}

function main() {
  initHandlers();
}

document.addEventListener('deviceready', main, false);
