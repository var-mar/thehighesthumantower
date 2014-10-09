var socket;

/*
var takeButterfly = function(id) {
  console.log('emit take-butterfly', {microphoneID: id});
  socket.emit('take-butterfly', {microphoneID: id});
}

var handLost = function(id, position) {
  console.log('emit hand-lost', {microphoneID: id, position: position});
  socket.emit('hand-lost', {microphoneID: id, position: position});
}
*/
function setupSocket(){

  var socket = io();

  var reconnect = function() {
    socketConnectTimeInterval = setInterval(function () {
      socket.socket.reconnect();
      if(socket.socket.connected) {clearInterval(socketConnectTimeInterval);}
    }, 3000);
  };

  // try to connect many times until enter
  var socketConnectTimeInterval = setInterval(reconnect, 3000);
  var counterReceived = 0;

  //socket.set("reconnection limit", 5000);
  socket.on('connect', function() {
    console.log("connected");
    clearInterval(socketConnectTimeInterval);
  });

  socket.on('disconnect', function() {
    socketConnectTimeInterval = setInterval(function () {
      socket.socket.reconnect();
      if(socket.socket.connected) {clearInterval(socketConnectTimeInterval);}
    }, 3000);
  });

  socket.on('get-full-tower',function(data){
    console.log("get-full-tower", data);
  });
  
  socket.on('update-tower',function(data){
    console.log("new-tower", data);
  });

  /*
  socket.on('butterfly-not-available',function(data){
    console.log("butterfly-not-available", data);
    hideBfly(data.microphoneID-1);
    delete availableMics[data.microphoneID];
  });
    
  socket.on('load-new-butterfly',function(data){
    console.log("load-new-butterfly", data);
    butterflyImageLoader.load('http://' + ipServer + ':6001/butterflyTextures/'+ data.wishID+ '.png', function(image){});
    var id = atob(data.wishID);
    var idU8Arr = [];
    for (var i=0; i<id.length; i++) {
      idU8Arr[i] = id.charCodeAt(i);
    }
    butterflies[data.microphoneID-1].butterflyStatus.setId(idU8Arr);
  });
  */

}