console.debug = console.log;

window.addEventListener("load", function() {
  var address = document.getElementById("address");
  var client = new chromeNetworking.clients.baseClient('udp');

  document.getElementById("connect").onclick = function(ev) {
    reconnect(client, address.value);
  };
  address.onkeydown = function(ev) {
    if (ev.which == 13) {
      reconnect(client, address.value);
    }
  };
  document.body.onkeydown = function(ev) {
    console.log("sending: " + ev.which);
    client.send(new Uint32Array([ev.which]).buffer, null);
  };
  connect(client, address.value);
});

function connect(client, address) {
  var hostnamePort = address.split(":");
  var hostname = hostnamePort[0];
  var port = (hostnamePort[1] || 7) | 0;
  console.log("connecting to: " + hostname + " " + port);
  client.connect(hostname, port, function() {
    console.log("connected");
  });
}

function reconnect(client, address) {
  client.disconnect();
  connect(client, address);
}
