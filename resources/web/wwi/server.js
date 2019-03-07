/* global webots */
'use strict';

function Server(url, view, onready) {
  this.view = view;
  this.onready = onready;

  // url has the following form: "ws(s)://cyberbotics2.cyberbotics.com:80/simple/worlds/simple.wbt"
  var n = url.indexOf('/', 6);
  var m = url.lastIndexOf('/');
  this.url = 'http' + url.substring(2, n); // e.g., "http(s)://cyberbotics2.cyberbotics.com:80"
  this.project = url.substring(n + 1, m - 7); // e.g., "simple"
  this.worldFile = url.substring(m + 1); // e.g., "simple.wbt"
  this.controllers = [];
};

Server.prototype = {
  constructor: Server,

  connect: function() {
    var that = this;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.url + '/session', true);
    $('#webotsProgressMessage').html('Connecting to session server...');
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState !== 4)
        return;
      if (xhr.status !== 200)
        return;
      var data = xhr.responseText;
      if (data.startsWith('Error:')) {
        $('#webotsProgress').hide();
        var errorMessage = data.substring(6).trim();
        errorMessage = errorMessage.charAt(0).toUpperCase() + errorMessage.substring(1);
        webots.alert('Session server error', errorMessage);
        return;
      }
      that.socket = new WebSocket(data + '/client');
      that.socket.onopen = that.onopen;
      that.socket.onmessage = that.onmessage;
      that.socket.onclose = function(event) {
        that.view.console.info('Disconnected to the Webots server.');
      };
      that.socket.onerror = function(event) {
        that.view.console.error('Cannot connect to the simulation server');
      };
    };
    xhr.send();
  },

  onopen: function() {
    var host = location.protocol + '//' + location.host.replace(/^www./, ''); // remove 'www' prefix
    if (typeof webots.User1Id === 'undefined')
      webots.User1Id = '';
    if (typeof webots.User1Name === 'undefined')
      webots.User1Name = '';
    if (typeof webots.User1Authentication === 'undefined')
      webots.User1Authentication = '';
    if (typeof webots.User2Id === 'undefined')
      webots.User2Id = '';
    if (typeof webots.User2Name === 'undefined')
      webots.User2Name = '';
    if (typeof webots.CustomData === 'undefined')
      webots.CustomData = '';
    this.send('{ "init" : [ "' + host + '", "' + this.project + '", "' + this.worldFile + '", "' +
              webots.User1Id + '", "' + webots.User1Name + '", "' + webots.User1Authentication + '", "' +
              webots.User2Id + '", "' + webots.User2Name + '", "' + webots.CustomData + '" ] }');
    $('#webotsProgressMessage').html('Starting simulation...');
  },

  onmessage: function(event) {
    var message = event.data;
    if (message.indexOf('webots:ws://') === 0 || message.indexOf('webots:wss://') === 0)
      this.view.stream = new webots.Stream(message.substring(7), this.view, this.onready);
    else if (message.indexOf('controller:') === 0) {
      var n = message.indexOf(':', 11);
      var controller = {};
      controller.name = message.substring(11, n);
      controller.port = message.substring(n + 1);
      this.view.console.info('Using controller ' + controller.name + ' on port ' + controller.port);
      this.controllers.push(controller);
    } else if (message.indexOf('queue:') === 0)
      this.view.console.error('The server is saturated. Queue to wait: ' + message.substring(6) + ' client(s).');
    else if (message === '.') { // received every 5 seconds when Webots is running
      // nothing to do
    } else if (message.indexOf('reset controller:') === 0)
      this.view.stream.socket.send('sync controller:' + message.substring(18).trim());
    else
      console.log('Received an unknown message from the Webots server socket: "' + message + '"');
  },

  resetController: function(filename) {
    this.socket.send('{ "reset controller" : "' + filename + '" }');
  }
};
