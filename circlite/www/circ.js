function onRead(result) {
    console.log("read:");
    console.log(new Uint8Array(result.data));
}

function onWrite(result) {
    console.log("write:");
    console.log(result);
}

chrome.socket.create('tcp', {}, function(socketInfo) {
    console.log("created: " + socketInfo.socketId);
    chrome.socket.connect(socketInfo.socketId, "127.0.0.1", 1234, function(connectResult) {
        var connected = (connectResult == 0);
        console.log('connect result: ' + connectResult + " connected: " + connected);
        chrome.socket.write(socketInfo.socketId, new Uint8Array([1,2,3,4,5]).buffer, onWrite);
        chrome.socket.write(socketInfo.socketId, "test1", onWrite);
        chrome.socket.read(socketInfo.socketId, 10, onRead);
    });
});
