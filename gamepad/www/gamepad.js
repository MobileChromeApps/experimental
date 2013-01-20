// TODO: finish this, make it easier
var buttonLayouts = {
  snes: ['dpad-left', 'button-1', 'button-2', 'button-3', 'button-y'],
  ps: ['dpad-left', 'dpad-right', 'button-a', 'button-b', 'button-x', 'button-y'],
};

function requestGamepad(buttonLayout) {
}

function describeButton(button, description) {
}

function onDpadVectorChange(dpadid, vector) {
}

function onButtonDown(buttonid) {
}

function onButtonUp(buttonid) {
}

function onButtonPress(buttonid) {
}

function writeAndRead(socketId) {
    var message = 'Hello World!\n';
    var data = new Uint8Array(message.length);
    for(var i = 0; i<message.length; i++) {
      data[i] = message.charCodeAt(i);
    }
    chrome.socket.write(socketId, data.buffer, function(result) {
      console.log('write result: ' + result);
    });
    chrome.socket.read(socketId, function(result) {
      console.log('read result: ' + result.data);
      console.log(String.fromCharCode.apply(null, new Uint8Array(result.data)));

      chrome.socket.disconnect(socketId);
      chrome.socket.destroy(socketId);
    });
}

function connect() {
  chrome.socket.create('tcp', {}, function(socketInfo) {
    console.log('created: ' + socketInfo.socketId);
    chrome.socket.connect(socketInfo.socketId, '127.0.0.1', 1234, function(connectResult) {
      var connected = (connectResult == 0);
      console.log('connect result: ' + connectResult + ' connected: ' + connected);

      writeAndRead(socketInfo.socketId);
    });
  });
}

function accept() {
  chrome.socket.create('tcp', {}, function(socketInfo) {
    console.log('created: ' + socketInfo.socketId);

    chrome.socket.listen(socketInfo.socketId, '127.0.0.1', 1234, 0, function(listenResult) {
      console.log('listen result: ' + listenResult);

      chrome.socket.accept(socketInfo.socketId, function(acceptResult) {
        var accepted = (acceptResult.resultCode == 0);
        console.log('accept result: ' + acceptResult + ' accepted: ' + accepted + ' socketId: ' + acceptResult.socketId);

        writeAndRead(acceptResult.socketId);
      });
    });
  });
}

window.onload = function() {
  document.querySelector('input#connect').onclick = connect;
  document.querySelector('input#accept').onclick = accept;
}

document.addEventListener("deviceready", window.onload, false);
