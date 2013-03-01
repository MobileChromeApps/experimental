var watchId = null;

function roundedTo(num, digits) {
  var multiple = Math.pow(10, digits);
  return Math.round(num * multiple) / multiple;
}

function setDroneDirection(x, y) {
  var leftRight = document.querySelector("#leftRight");
  var forwardBack = document.querySelector("#forwardBack");

  var directionX = (x < 0) ? 'right' : (x > 0) ? 'left' : 'still';
  var directionY = (y < 0) ? 'forward' : (y > 0) ? 'back' : 'still';

  leftRight.innerText = directionX + ': ' + x;
  forwardBack.innerText = directionY + ': ' + y;

  DRONE.API.tiltLeftRight(-(x/10));
  DRONE.API.tiltFrontBack(+(y/10));
}

function takeOff() {
  DRONE.API.takeOff();

  watchId = navigator.accelerometer.watchAcceleration(function (a) {
    setDroneDirection(roundedTo(a.x, 1), roundedTo(a.y, 1));
  }, null, { frequency: 100 });
}

function land() {
  DRONE.API.land();

  if (watchId) {
    navigator.accelerometer.clearWatch(watchId);
    watchId = null;
  }
}

function onDroneConnected() {
  document.querySelector("#message").style.display = 'none';
  document.querySelector("#connect").style.display = 'none';
  document.querySelector("#takeOff").style.display = 'block';
  document.querySelector("#land").style.display = 'block';

  document.querySelector("#takeOff").onclick = function() {
    takeOff();
  };
  document.querySelector("#land").onclick = function() {
    land();
  };
}

function onDroneConnectionFailed() {
  console.log("Connection failed - Are you attached to the Drone's Wifi network?");
}

function connect() {
  DRONE.API.init(onDroneConnected, onDroneConnectionFailed);
  //onDroneConnected();
}

function log(msg) {
  //console.log(msg);
}

document.addEventListener('deviceready', function() {
  document.querySelector("#connect").onclick = function() {
    connect();
  };
}, false);

