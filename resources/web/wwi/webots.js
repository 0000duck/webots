/*
 * Injects a Webots 3D view inside a HTML tag.
 * @class
 * @classdesc
 *   The Webots view object displays a 3D view on a web page.
 *   This view represents a Webots simulation world that may be
 *   connected to a webots instance running on a remote server.
 *   This library depends on the x3dom-full.js library // TODO
 * @example
 *   // Example: Initialize from a Webots streaming server
 *   var view = new webots.View(document.getElementById("myDiv"));
 *   view.open("ws://localhost:80/simple/worlds/simple.wbt");
 *   // or view.open("ws://localhost:80");
 *   // or view.open("file.x3d");
 *   view.onready = function() {
 *       // the initialization is done
 *   }
 *   view.onclose = function() {
 *       view = null;
 *   }
 */

/* global THREE, Animation, X3dSceneManager, MouseEvents, Server, Stream, ContextMenu, VideoManager */
/* global ace: false */
/* global MathJax: false */
/* eslint no-extend-native: ["error", { "exceptions": ["String"] }] */
/* eslint no-eval: "off" */

/* The following member variables should be set by the application:

webots.User1Id             // ID of the main user (integer value > 0). If 0 or unset, the user is not logged in.
webots.User1Name           // user name of the main user.
webots.User1Authentication // password or authentication for the main user (empty or unset if user not authenticated).
webots.User2Id             // ID of the secondary user (in case of a soccer match between two different users). 0 or unset if not used.
webots.User2Name           // user name of the secondary user.
webots.CustomData          // application specific data to be passed to the simulation server
webots.showRevert          // defines whether the revert button should be displayed
webots.showQuit            // defines whether the quit button should be displayed

*/

var webots = window.webots || {};

var scripts = document.getElementsByTagName('script');
webots.WwiUrl = scripts[scripts.length - 1].src;
webots.WwiUrl = webots.WwiUrl.substr(0, webots.WwiUrl.lastIndexOf('/') + 1); // remove "webots.js"

webots.View = function(view3D, mobile) {
  webots.currentView = this;
  var that = this;
  this.onerror = function(text) {
    console.log('%c' + text, 'color:black');
    that.onrobotwindowsdestroy();
  };
  this.onstdout = function(text) {
    console.log('%c' + text, 'color:blue');
  };
  this.onstderr = function(text) {
    console.log('%c' + text, 'color:red');
  };
  this.onrobotmessage = function(robot, message) {
    if (that.robotWindowNames[robot] === undefined) {
      console.log("Robot '" + robot + "' has no associated robot window");
      return;
    }
    that.robotWindows[that.robotWindowNames[robot]].receive(message, robot);
  };
  this.onrobotwindowsdestroy = function() {
    that.robotWindowsGeometries = {};
    for (var win in that.robotWindows) {
      that.robotWindowsGeometries[win] = that.robotWindows[win].geometry();
      that.robotWindows[win].destroy();
    }
    that.infoWindow = null;
    that.robotWindows = {}; // delete robot windows
    that.robotWindowNames = {};
  };
  this.onquit = function() {
    // If the simulation page URL is this https://mydomain.com/mydir/mysimulation.html, the quit action redirects to the
    // folder level, e.g., https://mydomain.com/mydir/
    // If the simulation page is https://mydomain.com/mydir/mysimulation/, the quit action redirects to the upper level:
    // https://mydomain.com/mydir/
    // You can change this behavior by overriding this onquit() method
    var currentLocation = window.location.href;
    // remove filename or last directory name from url and keep the final slash
    var quitDestination = currentLocation.substring(0, currentLocation.lastIndexOf('/', currentLocation.length - 2) + 1);
    window.location = quitDestination;
  };
  this.onresize = function() {
    /* TODO
    var viewpoint = that.x3dSceneManager.getElementsByTagName('Viewpoint')[0];
    var viewHeight = parseFloat($(that.x3dNode).css('height').slice(0, -2));
    var viewWidth = parseFloat($(that.x3dNode).css('width').slice(0, -2));
    if (that.viewpointFieldOfView == null) {
      var fieldOfView = viewpoint.getAttribute('fieldOfView');
      // Sometimes the page is not fully loaded by that point and the field of view is not yet available.
      // In that case we add a callback at the end of the queue to try again when all other callbacks are finished.
      if (fieldOfView == null) {
        setTimeout(that.onresize, 0);
        return;
      }
      that.viewpointFieldOfView = fieldOfView;
    }

    var fieldOfViewY = that.viewpointFieldOfView;
    if (viewWidth > viewHeight) {
      var tanHalfFieldOfViewY = Math.tan(0.5 * that.viewpointFieldOfView) * viewHeight / viewWidth;
      fieldOfViewY = 2.0 * Math.atan(tanHalfFieldOfViewY);
    }

    viewpoint.setAttribute('fieldOfView', fieldOfViewY);
*/
  };
  this.ondialogwindow = function(opening) {
    // Pause the simulation if needed when a pop-up dialog window is open
    // and restart running the simulation when it is closed
    if (opening && that.isAutomaticallyPaused === undefined) {
      that.isAutomaticallyPaused = webots.currentView.pauseButton.style.display === 'inline';
      that.pauseButton.click();
    } else if (!opening && that.isAutomaticallyPaused) {
      that.real_timeButton.click();
      that.isAutomaticallyPaused = undefined;
    }
  };
  window.onresize = this.onresize;
  this.robotWindowNames = {}; // map robot name to robot window name used as key in robotWindows lists
  this.robotWindows = {};
  this.onmousedown = null;
  this.onworldloaded = null;
  this.view3D = view3D;
  this.viewpointFieldOfView = null;
  if (mobile === undefined)
    this.mobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  else
    this.mobileDevice = mobile;
  this.fullscreenEnabled = !/iPhone|iPad|iPop/i.test(navigator.userAgent);
  if (!this.fullscreenEnabled)
    // add tag needed to run standalone web page in fullscreen on iOS
    $('head').append('<meta name="apple-mobile-web-app-capable" content="yes">');

  // prevent the backspace key to quit the simulation page
  var rx = /INPUT|SELECT|TEXTAREA/i;
  $(document).bind('keydown keypress', function(e) {
    if (e.which === 8) { // backspace key
      if (!rx.test(e.target.tagName) || e.target.disabled || e.target.readOnly)
        e.preventDefault();
    }
  });
  this.view3D.className = view3D.className + ' webotsView';
  this.contextMenu = new ContextMenu(webots.User1Id && !webots.User1Authentication, this.view3D);
  this.contextMenu.onEditController = function(controller) { that.editController(controller); };
  this.contextMenu.onFollowObject = function(id) { that.x3dSceneManager.viewpoint.follow(id); };
  this.contextMenu.isFollowedObject = function(object3d, setResult) { setResult(that.x3dSceneManager.viewpoint.isFollowedObject(object3d)); };
  this.contextMenu.onOpenRobotWindow = function(robotName) { that.openRobotWindowValid(robotName); };
  this.contextMenu.isRobotWindowValid = function(robotName, setResult) { setResult(that.robotWindows[that.robotWindowNames[robotName]]); };
  this.console = new webots.Console(view3D, this.mobileDevice);
  this.editor = new webots.Editor(view3D, this);
  this.infoWindow = null;
  this.selection = null;
  this.x3dSceneManager = null;
  this.initialViewpointPosition = null;
  this.initialViewpointOrientation = null;
  this.mouseState = {
    'initialized': false,
    'mouseDown': 0,
    'moved': false,
    'pickPosition': null,
    'wheelFocus': false,
    'wheelTimeout': null
  };
  this.animation = null;
  this.debug = false;
  this.timeout = 60 * 1000; // default to one minute
  this.time = undefined;
  this.deadline = this.timeout;
  this.runOnLoad = false;
  this.quitting = false;
};

webots.View.prototype.setTimeout = function(timeout) { // expressed in seconds
  if (timeout < 0) {
    this.timeout = timeout;
    this.deadline = 0;
    return;
  }

  this.timeout = timeout * 1000; // convert to millisecons
  this.deadline = this.timeout;
  if (this.time !== undefined)
    this.deadline += this.time;
};

webots.View.prototype.setWebotsDocUrl = function(url) {
  this.webotsDocUrl = url;
};

webots.View.prototype.updateWorldList = function(currentWorld, worlds) {
  var that = this;
  if (typeof this.worldSelect !== 'undefined')
    this.worldSelectionDiv.removeChild(this.worldSelect);
  if (worlds.length <= 1)
    return;
  this.worldSelect = document.createElement('select');
  this.worldSelect.id = 'worldSelection';
  this.worldSelectionDiv.appendChild(this.worldSelect);
  for (var i = 0; i < worlds.length; i++) {
    var option = document.createElement('option');
    option.value = worlds[i];
    option.text = worlds[i];
    this.worldSelect.appendChild(option);
    if (currentWorld === worlds[i])
      this.worldSelect.selectedIndex = i;
  }
  this.worldSelect.onchange = loadWorld;
  function loadWorld() {
    if (that.broadcast || typeof that.worldSelect === 'undefined')
      return;
    that.enableToolBarButtons(false);
    that.x3dSceneManager.viewpoint.resetFollow();
    that.onrobotwindowsdestroy();
    $('#webotsProgressMessage').html('Loading ' + that.worldSelect.value + '...');
    $('#webotsProgress').show();
    that.stream.socket.send('load:' + that.worldSelect.value);
  }
};

webots.View.prototype.enableToolBarButtons = function(enabled) {
  var buttons = [this.infoButton, this.revertButton, this.resetButton, this.stepButton, this.real_timeButton, this.fastButton, this.pauseButton, this.consoleButton, this.worldSelect];
  for (var i in buttons) {
    if (buttons[i]) {
      if ((!this.broadcast || buttons[i] === this.consoleButton) && enabled) {
        buttons[i].disabled = false;
        buttons[i].classList.remove('toolBarButtonDisabled');
      } else {
        buttons[i].disabled = true;
        buttons[i].classList.add('toolBarButtonDisabled');
      }
    }
  }
};

webots.View.prototype.open = function(url, mode) {
  if (mode === undefined)
    mode = 'x3dom';
  var that = this;
  this.mode = mode;
  this.videoStream = null;
  if (mode === 'video') {
    this.url = url;
    this.video = new VideoManager(this.view3D, this.mouseEvents);
    initWorld();
    return;
  }
  if (mode !== 'x3dom') {
    console.log('Error: webots.View.open: wrong mode argument: ' + mode);
    return;
  }
  if (this.broadcast)
    this.setTimeout(-1);
  if (!this.x3dSceneManager) {
    var x3dDiv = document.createElement('div');
    x3dDiv.className = 'webots3DView';
    this.view3D.appendChild(x3dDiv);
    this.x3dSceneManager = new X3dSceneManager(x3dDiv);
    that.x3dSceneManager.init();
    var param = document.createElement('param');
    param.name = 'showProgress';
    param.value = false;
    this.x3dSceneManager.domElement.appendChild(param);

    this.mouseEvents = new MouseEvents(this.x3dSceneManager, this.contextMenu, x3dDiv);
  }

  this.url = url;
  this.isWebSocketProtocol = this.url.startsWith('ws://') || this.url.startsWith('wss://');

  // TODO if THREE js library is already loaded the if is useless
  /* if (this.url === undefined)
    //loadTHREEjs(); TODO
  else
    initWorld();
  */
  initWorld();

  function requestQuit() {
    if (that.unloggedFileModified || that.editor.hasUnsavedChanges()) {
      var text;
      if (that.unloggedFileModified || !webots.User1Id)
        text = 'Your changes to the robot controller will be lost because you are not logged in.';
      else
        text = 'Your unsaved changes to the robot controller will be lost.';
      var quitDialog = document.getElementById('quitDialog');
      if (!quitDialog) {
        quitDialog = document.createElement('div');
        quitDialog.id = 'quitDialog';
        $(quitDialog).html(text);
        that.view3D.appendChild(quitDialog);
        $(quitDialog).dialog({
          title: 'Quit the simulation?',
          modal: true,
          resizable: false,
          appendTo: that.view3D,
          open: webotsOpenDialog,
          buttons: {
            'Cancel': function() {
              $(this).dialog('close');
            },
            'Quit': function() {
              $(this).dialog('close');
              quit();
            }
          }
        });
      } else
        $(quitDialog).dialog('open');
      return;
    }
    quit();
  }
  function quit() {
    if (that.broadcast)
      return;
    $('#webotsProgressMessage').html('Bye bye...');
    $('#webotsProgress').show();
    that.quitting = true;
    that.onquit();
  }
  function reset(revert = false) {
    if (that.broadcast)
      return;
    that.time = 0; // reset time to correctly compute the initial deadline
    if (revert)
      $('#webotsProgressMessage').html('Reverting simulation...');
    else
      $('#webotsProgressMessage').html('Restarting simulation...');
    $('#webotsProgress').show();
    that.runOnLoad = that.pauseButton.style.display === 'inline';
    pause();
    for (var i = 0; i < that.editor.filenames.length; i++) {
      that.editor.save(i);
      if (that.editor.needToUploadFiles[i])
        that.editor.upload(i);
    }
    that.onrobotwindowsdestroy();
    if (that.timeout >= 0) {
      that.deadline = that.timeout;
      $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(that.deadline));
    } else
      $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(0));
    that.enableToolBarButtons(false);
    if (revert)
      that.stream.socket.send('revert');
    else
      that.stream.socket.send('reset');
  }
  function pause() {
    if (that.broadcast)
      return;
    that.contextMenu.hide();
    that.stream.socket.send('pause');
  }
  function realTime() {
    if (that.broadcast)
      return;
    that.contextMenu.hide();
    that.stream.socket.send('real-time:' + that.timeout);
    that.pauseButton.style.display = 'inline';
    that.real_timeButton.style.display = 'none';
    if (that.fastButton !== undefined)
      that.fastButton.style.display = 'inline';
  }
  function fast() {
    if (that.broadcast)
      return;
    that.contextMenu.hide();
    that.stream.socket.send('fast:' + that.timeout);
    that.pauseButton.style.display = 'inline';
    that.real_timeButton.style.display = 'inline';
    that.fastButton.style.display = 'none';
  }
  function step() {
    if (that.broadcast)
      return;
    that.contextMenu.hide();
    that.pauseButton.style.display = 'none';
    that.real_timeButton.style.display = 'inline';
    if (that.fastButton !== undefined)
      that.fastButton.style.display = 'inline';
    that.stream.socket.send('step');
  }
  function requestFullscreen() {
    that.contextMenu.hide();
    var elem = that.view3D;
    if (elem.requestFullscreen)
      elem.requestFullscreen();
    else if (elem.msRequestFullscreen)
      elem.msRequestFullscreen();
    else if (elem.mozRequestFullScreen)
      elem.mozRequestFullScreen();
    else if (elem.webkitRequestFullscreen)
      elem.webkitRequestFullscreen();
  }
  function exitFullscreen() {
    that.contextMenu.hide();
    if (document.exitFullscreen)
      document.exitFullscreen();
    else if (document.msExitFullscreen)
      document.msExitFullscreen();
    else if (document.mozCancelFullScreen)
      document.mozCancelFullScreen();
    else if (document.webkitExitFullscreen)
      document.webkitExitFullscreen();
  }
  function fullscreenchange(event) {
    var element = document.fullScreenElement || document.mozFullScreenElement || document.webkitFullScreenElement || document.msFullScreenElement || document.webkitCurrentFullScreenElement;
    if (element != null) {
      that.fullscreenButton.style.display = 'none';
      that.exit_fullscreenButton.style.display = 'inline';
    } else {
      that.fullscreenButton.style.display = 'inline';
      that.exit_fullscreenButton.style.display = 'none';
    }
  }
  function toolBarButton(name, tooltip) {
    var buttonName = name + 'Button';
    that[buttonName] = document.createElement('button');
    that[buttonName].id = buttonName;
    that[buttonName].className = 'toolBarButton';
    that[buttonName].title = tooltip;
    that[buttonName].style.backgroundImage = 'url(' + webots.WwiUrl + 'images/' + name + '.png)';
    return that[buttonName];
  }
  function toggleConsole() {
    that.contextMenu.hide();
    if ($('#webotsConsole').is(':visible')) {
      $('#webotsConsole').dialog('close');
      that.consoleButton.classList.remove('toolBarButtonActive');
    } else {
      $('#webotsConsole').dialog('open');
      that.consoleButton.classList.add('toolBarButtonActive');
    }
  }
  function toggleHelp() {
    that.contextMenu.hide();
    if (!that.helpWindow) {
      if (!that.broadcast && that.webotsDocUrl)
        var webotsDocUrl = that.webotsDocUrl;
      that.helpWindow = new webots.HelpWindow(that.view3D, webotsDocUrl, that.mobileDevice);
      that.helpButton.classList.add('toolBarButtonActive');
    } else if ($('#webotsHelp').is(':visible')) {
      $('#webotsHelp').dialog('close');
      that.helpButton.classList.remove('toolBarButtonActive');
    } else {
      $('#webotsHelp').dialog('open');
      that.helpButton.classList.add('toolBarButtonActive');
    }
  }
  function initWorld() {
    if (that.mode === 'x3dom') {
      // TODO redirect the THREE js log entirely to the JS console (is it needed?)
      // TODO
      // x3dom.runtime.ready = addX3domMouseNavigation;
    }
    if (that.isWebSocketProtocol) {
      that.progress = document.createElement('div');
      that.progress.id = 'webotsProgress';
      that.progress.innerHTML = "<div><img src='" + webots.WwiUrl + "images/load_animation.gif'>" +
                                "</div><div id='webotsProgressMessage'>Initializing...</div>" +
                                "</div><div id='webotsProgressPercent'></div>";
      that.view3D.appendChild(that.progress);
      that.toolBar = document.createElement('div');
      that.toolBar.id = 'toolBar';
      that.toolBar.left = document.createElement('div');
      that.toolBar.left.className = 'toolBarLeft';
      if (typeof webots.showQuit === 'undefined' || webots.showQuit) { // enabled by default
        that.toolBar.left.appendChild(toolBarButton('quit', 'Quit the simulation'));
        that.quitButton.onclick = requestQuit;
      }
      that.toolBar.left.appendChild(toolBarButton('info', 'Open the information window'));
      that.infoButton.onclick = toggleInfo;
      that.worldSelectionDiv = document.createElement('div');
      that.toolBar.left.appendChild(that.worldSelectionDiv);
      if (webots.showRevert) { // disabled by default
        that.toolBar.left.appendChild(toolBarButton('revert', 'Save controllers and revert the simulation'));
        that.revertButton.addEventListener('click', function() { reset(true); });
      }
      that.toolBar.left.appendChild(toolBarButton('reset', 'Save controllers and reset the simulation'));
      that.resetButton.addEventListener('click', function() { reset(false); });
      that.toolBar.left.appendChild(toolBarButton('step', 'Perform one simulation step'));
      that.stepButton.onclick = step;
      that.toolBar.left.appendChild(toolBarButton('real_time', 'Run the simulation in real time'));
      that.real_timeButton.onclick = realTime;
      that.toolBar.left.appendChild(toolBarButton('pause', 'Pause the simulation'));
      that.pauseButton.onclick = pause;
      that.pauseButton.style.display = 'none';
      that.toolBar.left.appendChild(toolBarButton('fast', 'Run the simulation as fast as possible'));
      that.fastButton.onclick = fast;
      var div = document.createElement('div');
      div.className = 'webotsTime';
      var clock = document.createElement('span');
      clock.id = 'webotsClock';
      clock.title = 'Current simulation time';
      clock.innerHTML = webots.parseMillisecondsIntoReadableTime(0);
      div.appendChild(clock);
      var timeout = document.createElement('span');
      timeout.id = 'webotsTimeout';
      timeout.title = 'Simulation time out';
      timeout.innerHTML = webots.parseMillisecondsIntoReadableTime(that.deadline);
      div.appendChild(document.createElement('br'));
      div.appendChild(timeout);
      that.toolBar.left.appendChild(div);
      that.toolBar.left.appendChild(toolBarButton('console', 'Open the console window'));
      that.consoleButton.onclick = toggleConsole;
      that.toolBar.right = document.createElement('div');
      that.toolBar.right.className = 'toolBarRight';
      that.toolBar.right.appendChild(toolBarButton('help', 'Get help on the simulator'));
      that.helpButton.onclick = toggleHelp;
      if (that.fullscreenEnabled) {
        that.toolBar.right.appendChild(toolBarButton('exit_fullscreen', 'Exit fullscreen'));
        that.exit_fullscreenButton.onclick = exitFullscreen;
        that.exit_fullscreenButton.style.display = 'none';
        that.toolBar.right.appendChild(toolBarButton('fullscreen', 'Enter fullscreen'));
        that.fullscreenButton.onclick = requestFullscreen;
      }
      that.toolBar.appendChild(that.toolBar.left);
      that.toolBar.appendChild(that.toolBar.right);
      that.view3D.appendChild(that.toolBar);
      that.enableToolBarButtons(false);
      if (that.broadcast && that.quitButton) {
        that.quitButton.disabled = true;
        that.quitButton.classList.add('toolBarButtonDisabled');
        that.contextMenu.disableEdit();
      }
      document.addEventListener('fullscreenchange', fullscreenchange);
      document.addEventListener('webkitfullscreenchange', fullscreenchange);
      document.addEventListener('mozfullscreenchange', fullscreenchange);
      document.addEventListener('MSFullscreenChange', fullscreenchange);
      if (that.url.endsWith('.wbt')) { // url expected form: "ws://localhost:80/simple/worlds/simple.wbt"
        var callback;
        if (that.mode === 'video')
          callback = that.video.finalize;
        else
          callback = finalizeWorld;
        that.server = new Server(that.url, that, callback);
        that.server.connect();
      } else { // url expected form: "ws://cyberbotics2.cyberbotics.com:80"
        that.stream = new Stream(that.url, that, finalizeWorld);
        that.stream.connect();
      }
    } else { // assuming it's an URL to a .x3d file
      that.x3dSceneManager.loadWorldFile(that.url);
      finalizeWorld();
    }
  }

  function toggleInfo() {
    that.toggleInfo();
  }

  function finalizeWorld() {
    $('#webotsProgressMessage').html('Loading HTML and Javascript files...');
    if (that.x3dSceneManager.viewpoint.followedObjectId == null || that.broadcast)
      that.x3dSceneManager.viewpoint.initFollowParameters();
    else
      // reset follow parameters
      that.x3dSceneManager.viewpoint.follow(that.x3dSceneManager.viewpoint.followedObjectId);

    if (!that.isWebSocketProtocol) { // skip robot windows initialization
      if (that.animation != null)
        that.animation.init(loadFinalize);
      else
        loadFinalize();
      that.onresize();
      return;
    }

    function loadRobotWindow(node) {
      var windowName = node.getAttribute('window');
      that.robotWindowNames[node.getAttribute('name')] = windowName;
      var win = new webots.RobotWindow(that.view3D, windowName, that.mobileDevice);
      that.robotWindows[windowName] = win;
      // init robot windows dialogs
      function closeInfoWindow() {
        $('#infoButton').removeClass('toolBarButtonActive');
      }
      if (windowName === infoWindowName) {
        var user;
        if (webots.User1Id) {
          user = ' [' + webots.User1Name;
          if (webots.User2Id)
            user += '/' + webots.User2Name;
          user += ']';
        } else
          user = '';
        win.setProperties({title: that.x3dSceneManager.worldInfo.title + user, close: closeInfoWindow});
        that.infoWindow = win;
      } else
        win.setProperties({title: 'Robot: ' + node.getAttribute('name')});
      pendingRequestsCount++;
      $.get('window/' + windowName + '/' + windowName + '.html', function(data) {
        // we need to fix the img src relative URLs
        var d = data.replace(/ src='/g, ' src=\'window/' + windowName + '/').replace(/ src="/g, ' src="window/' + windowName + '/');
        win.setContent(d);
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, win[0]]);
        $.get('window/' + windowName + '/' + windowName + '.js', function(data) {
          eval(data);
          pendingRequestsCount--;
          if (pendingRequestsCount === 0)
            loadFinalize();
        }).fail(function() {
          pendingRequestsCount--;
          if (pendingRequestsCount === 0)
            loadFinalize();
        });
      }).fail(function() {
        if (windowName === infoWindowName)
          that.infoWindow = null;
        pendingRequestsCount--;
        if (pendingRequestsCount === 0)
          loadFinalize();
      });
    }

    var infoWindowName = that.x3dSceneManager.worldInfo.window;
    var pendingRequestsCount = 1; // start from 1 so that it can be 0 only after the loop is completed and all the nodes are checked
    var nodes = that.x3dSceneManager.root ? that.x3dSceneManager.root.children : [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i] instanceof THREE.Transform && nodes[i].userData.window && nodes[i].userData.name)
        loadFinalize();
    }
    pendingRequestsCount--; // notify that loop is completed

    if (pendingRequestsCount === 0)
      // if no pending requests execute loadFinalize
      // otherwise it will be executed when the last request will be handled
      loadFinalize();
  }

  function loadFinalize() {
    $('#webotsProgress').hide();
    that.enableToolBarButtons(true);

    if (that.onready)
      that.onready();

    // restore robot windows
    if (that.robotWindowsGeometries) { // on reset
      for (var win in that.robotWindows) {
        if (win in that.robotWindowsGeometries) {
          that.robotWindows[win].restoreGeometry(that.robotWindowsGeometries[win]);
          if (that.robotWindowsGeometries[win].open) {
            if (that.robotWindows[win] === that.infoWindow)
              that.toggleInfo();
            else
              that.robotWindows[win].open();
          }
        }
      }
    } else if (that.infoWindow && !that.broadcast) // at first load
      that.toggleInfo();
    that.viewpointLastUpdate = undefined;

    if (that.runOnLoad)
      realTime();
  }
};

webots.View.prototype.toggleInfo = function() {
  this.contextMenu.hide();
  if (!this.infoWindow)
    return;
  if (this.infoWindow.isOpen()) {
    this.infoWindow.close();
    this.infoButton.classList.remove('toolBarButtonActive');
  } else {
    this.infoWindow.open();
    this.infoButton.classList.add('toolBarButtonActive');
  }
};

webots.View.prototype.close = function() {
  if (this.server)
    this.server.socket.close();
  if (this.stream)
    this.stream.close();
};

webots.View.prototype.sendRobotMessage = function(robot, message) {
  this.stream.socket.send('robot:' + robot + ':' + message);
};

webots.View.prototype.resize = function(width, height) {
  if (this.video)
    this.video.resize(width, height);
};

webots.View.prototype.getControllerUrl = function(name) {
  if (!this.server)
    return;
  var port = 0;
  for (var i = 0; i < this.server.controllers.length; i++) {
    if (this.server.controllers[i].name === name) {
      port = this.server.controllers[i].port;
      break;
    }
  }
  if (port === 0)
    return;
  return this.url.substring(0, this.url.indexOf(':', 6) + 1) + port;
};

webots.View.prototype.setAnimation = function(url, gui, loop) {
  if (gui === undefined)
    gui = 'play';
  if (loop === undefined)
    loop = true;
  this.animation = new Animation(url, this.x3dSceneManager, this, gui, loop);
  this.animation.init(() => {
    $('#webotsProgress').hide();
    this.enableToolBarButtons(true);
    if (this.onready)
      this.onready();
  });
};

webots.View.prototype.destroyWorld = function() {
  // this.selection = null;
  if (this.x3dSceneManager)
    this.x3dSceneManager.destroyWorld();

  // remove labels
  var labels = document.getElementsByClassName('webotsLabel');
  for (var i = labels.length - 1; i >= 0; i--) {
    var element = labels.item(i);
    element.parentNode.removeChild(element);
  }
};

webots.View.prototype.editController = function(controller) {
  if (this.editor.dirname !== controller) {
    this.editor.closeAllTabs();
    this.editor.dirname = controller;
    this.stream.socket.send('get controller:' + controller);
  }
};

webots.View.prototype.openRobotWindowValid = function(robotName) {
  var win = this.robotWindows[this.robotWindowNames[robotName]];
  if (win) {
    if (win === this.infoWindow) {
      if (!this.infoWindow.isOpen())
        this.toggleInfo();
    } else
      win.open();
  } else
    console.log('No valid robot window for robot: ' + robotName);
};

function webotsClampDialogSize(preferredGeometry) {
  if ($('#playerDiv').height === undefined || $('#playerDiv').width === undefined)
    return preferredGeometry;

  var maxHeight = $('#playerDiv').height() - preferredGeometry.top - $('#toolBar').height() - 20; // 20 is chosen arbitrarily
  var maxWidth = $('#playerDiv').width() - preferredGeometry.left - 20; // 20 is chosen arbitrarily
  var height = preferredGeometry.height;
  var width = preferredGeometry.width;
  if (maxHeight < height)
    height = maxHeight;
  if (maxWidth < width)
    width = maxWidth;
  return {width: width, height: height};
}

function webotsResizeDialogOnOpen(dialog) {
  var w = $(dialog).parent().width();
  var h = $(dialog).parent().height();
  var clampedSize = webotsClampDialogSize({left: 0, top: 0, width: w, height: h});
  if (clampedSize.width < w)
    $(dialog).dialog('option', 'width', clampedSize.width);
  if (clampedSize.height < h)
    $(dialog).dialog('option', 'height', clampedSize.height);
}

function webotsOpenDialog() {
  webotsResizeDialogOnOpen(this);
  $(this).parent().css('opacity', 0.9);
  $(this).parent().hover(function() {
    $(this).css('opacity', 0.99);
  }, function(event) {
    $(this).css('opacity', 0.9);
  });
}

function webotsMobileCreateDialog() {
  // mobile only setup
  var closeButton = $('button:contains("WbClose")');
  closeButton.html('');
  closeButton.removeClass('ui-button-text-only');
  closeButton.addClass('mobile-dialog-close-button');
  closeButton.addClass('ui-button-icon-primary');
  closeButton.prepend('<span class="ui-icon ui-icon-closethick"></span>');
}

function webotsAddMobileDialogAttributes(params, panel) {
  params.dialogClass = 'mobile-no-default-buttons';
  params.create = webotsMobileCreateDialog;
  params.buttons = { 'WbClose': function() { $(panel).dialog('close'); } };
}

// the following two functions are used to make the resize and drag of the dialog
// steady (i.e., not loose the grab while resizing/dragging the dialog quickly)
function webotsDisablePointerEvents() {
  document.body.style['pointer-events'] = 'none';
}
function webotsEnablePointerEvents() {
  document.body.style['pointer-events'] = 'auto';
}

webots.Editor = function(parent, view) {
  var that = this;
  function webotsEditorResize() {
    var padding = $('#webotsEditorTab').outerHeight() - $('#webotsEditorTab').height();
    $('#webotsEditorTab').height(that.tabs.clientHeight - that.tabsHeader.scrollHeight - padding);
    that.editor.resize();
  }
  function hideMenu() {
    if ($('#webotsEditorMenu').hasClass('pressed'))
      $('#webotsEditorMenu').removeClass('pressed');
  }
  function openResetConfirmDialog(allFiles) {
    that.resetAllFiles = allFiles;
    var titleText, message;
    message = 'Permanently reset ';
    if (allFiles) {
      message += 'all the files';
      titleText = 'Reset files?';
    } else {
      message += 'this file';
      titleText = 'Reset file?';
    }
    message += ' to the original version?';
    message += '<br/><br/>Your modifications will be lost.';
    var confirmDialog = document.createElement('div');
    that.panel.appendChild(confirmDialog);
    $(confirmDialog).html(message);
    $(confirmDialog).dialog({
      title: titleText,
      modal: true,
      autoOpen: true,
      resizable: false,
      dialogClass: 'alert',
      open: webotsOpenDialog,
      appendTo: that.parent,
      buttons: {
        'Cancel': function() {
          $(this).dialog('close');
          $('#webotsEditorConfirmDialog').remove();
        },
        'Reset': function() {
          $(this).dialog('close');
          $('#webotsEditorConfirmDialog').remove();
          if (that.resetAllFiles) {
            for (var i = 0; i < that.filenames.length; i++)
              that.view.server.resetController(that.dirname + '/' + that.filenames[i]);
          } else
            that.view.server.resetController(that.dirname + '/' + that.filenames[that.currentSession]);
        }
      }
    });
    hideMenu();
  }
  this.view = view;
  this.filenames = [];
  this.needToUploadFiles = [];
  this.sessions = [];
  this.panel = document.createElement('div');
  this.panel.id = 'webotsEditor';
  this.panel.className = 'webotsTabContainer';
  that.parent = parent;
  parent.appendChild(this.panel);
  var clampedSize = webotsClampDialogSize({left: 0, top: 0, width: 800, height: 600});
  var params = {
    title: 'Editor',
    resize: webotsEditorResize,
    resizeStart: webotsDisablePointerEvents,
    resizeStop: webotsEnablePointerEvents,
    dragStart: webotsDisablePointerEvents,
    dragStop: webotsEnablePointerEvents,
    width: clampedSize.width,
    height: clampedSize.height,
    autoOpen: false,
    appendTo: parent,
    open: function() {
      webotsResizeDialogOnOpen(that.panel);
    }
  };
  if (this.view.mobileDevice)
    webotsAddMobileDialogAttributes(params, this.panel);
  $(this.panel).dialog(params).dialogExtend({maximizable: !this.view.mobileDevice});
  var edit = document.createElement('div');
  edit.id = 'webotsEditorTab';
  edit.className = 'webotsTab';
  this.editor = ace.edit(edit);
  this.sessions[0] = this.editor.getSession();
  this.currentSession = 0;
  this.tabs = document.createElement('div');
  this.tabs.id = 'webotsEditorTabs';
  this.tabs.className = 'webotsTabs';
  this.tabsHeader = document.createElement('ul');
  this.tabs.appendChild(this.tabsHeader);
  this.tabs.appendChild(edit);
  $(this.tabs).tabs({activate: function(event, ui) {
    that.currentSession = parseInt(ui.newTab.attr('id').substr(5)); // skip 'file-'
    that.editor.setSession(that.sessions[that.currentSession]);
  }});
  this.panel.appendChild(this.tabs);
  this.menu = document.createElement('div');
  this.menu.id = 'webotsEditorMenu';
  var saveShortcut;
  if (navigator.appVersion.indexOf('Mac') === -1)
    saveShortcut = 'Ctrl-S';
  else // macOS
    saveShortcut = 'Cmd-S';
  this.menu.innerHTML = '<input type="image" id="webotsEditorMenuImage" width="17px" src="' + webots.WwiUrl + '/images/menu.png">' +
                        '<div id="webotsEditorMenuContent">' +
                        '<div id="webotsEditorSaveAction" class="webotsEditorMenuContentItem" title="Save current file">Save<span style="float:right"><i><small>' + saveShortcut + '</small></i></span></div>' +
                        '<div id="webotsEditorSaveAllAction" class="webotsEditorMenuContentItem" title="Save all the files">Save All</div>' +
                        '<div id="webotsEditorResetAction" class="webotsEditorMenuContentItem" title="Reset current file to the original version">Reset</div>' +
                        '<div id="webotsEditorResetAllAction" class="webotsEditorMenuContentItem" title="Reset all the files to the original version">Reset All</div>' +
                        '</div>';
  this.panel.appendChild(this.menu);
  this.editor.commands.addCommand({
    name: 'save',
    bindKey: {win: 'Ctrl-S', mac: 'Cmd-S'},
    exec: function(editor) {
      that.save(that.currentSession);
    }
  });
  $('#webotsEditorSaveAction').click(function() {
    that.save(that.currentSession);
    hideMenu();
  });
  $('#webotsEditorSaveAllAction').click(function() {
    for (var i = 0; i < that.filenames.length; i++)
      that.save(i);
    hideMenu();
  });
  $('#webotsEditorResetAction').click(function() {
    openResetConfirmDialog(false);
  });
  $('#webotsEditorResetAllAction').click(function() {
    openResetConfirmDialog(true);
  });
  $('#webotsEditorMenuImage').click(function() {
    if ($('#webotsEditorMenu').hasClass('pressed'))
      $('#webotsEditorMenu').removeClass('pressed');
    else
      $('#webotsEditorMenu').addClass('pressed');
  });
  $('#webotsEditorMenu').focusout(function() {
    // let the time to handle the menu actions if needed
    window.setTimeout(function() {
      if ($('.webotsEditorMenuContentItem:hover').length > 0)
        return;
      if ($('#webotsEditorMenu').hasClass('pressed'))
        $('#webotsEditorMenu').removeClass('pressed');
    }, 100);
  });
};

webots.Editor.prototype.hasUnsavedChanges = function() {
  for (var i = 0; i < this.filenames.length; i++) {
    if ($('#filename-' + i).html().endsWith('*'))
      return true;
  }
  return false;
};

webots.Editor.prototype.storeUserFile = function(i) {
  var formData = new FormData();
  formData.append('dirname', this.view.server.project + '/controllers/' + this.dirname);
  formData.append('filename', this.filenames[i]);
  formData.append('content', this.sessions[i].getValue());
  $.ajax({
    url: '/ajax/upload-file.php',
    type: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    success: function(data) {
      if (data !== 'OK')
        webots.alert('File saving error', data);
    }
  });
};

webots.Editor.prototype.upload = function(i) { // upload to the simulation server
  this.view.stream.socket.send('set controller:' +
    this.dirname + '/' +
    this.filenames[i] + ':' +
    this.sessions[i].getLength() + '\n' +
    this.sessions[i].getValue());
  this.needToUploadFiles[i] = false;
};

webots.Editor.prototype.save = function(i) { // save to the web site
  if ($('#filename-' + i).html().endsWith('*')) { // file was modified
    $('#filename-' + i).html(this.filenames[i]);
    this.needToUploadFiles[i] = true;
    if (webots.User1Id && webots.User1Authentication) // user logged in
      this.storeUserFile(i);
    else
      this.view.unloggedFileModified = true;

    if (this.view.time === 0)
      this.upload(i);
    else {
      if (!this.statusMessage) {
        this.statusMessage = document.createElement('div');
        this.statusMessage.id = 'webotsEditorStatusMessage';
        this.statusMessage.className = 'webotsEditorStatusMessage';
        this.statusMessage.innerHTML = '<font size="2">Reset the simulation to apply the changes.</font>';
      }
      this.panel.appendChild(this.statusMessage);
      setTimeout(this.hideResetMessage, 1500);
    }
  }
};

webots.Editor.prototype.hideResetMessage = function() {
  $('#webotsEditorStatusMessage').remove();
};

webots.Editor.prototype.textChange = function(index) {
  if (!$('#filename-' + index).html().endsWith('*') && this.editor.curOp && this.editor.curOp.command.name) { // user change
    $('#filename-' + index).html(this.filenames[index] + '*');
  }
};

webots.Editor.prototype.aceMode = function(filename) {
  if (filename.toLowerCase() === 'makefile')
    return 'ace/mode/makefile';
  var extension = filename.split('.').pop().toLowerCase();
  if (extension === 'py')
    return 'ace/mode/python';
  if (extension === 'c' || extension === 'cpp' || extension === 'c++' || extension === 'cxx' || extension === 'cc' ||
      extension === 'h' || extension === 'hpp' || extension === 'h++' || extension === 'hxx' || extension === 'hh')
    return 'ace/mode/c_cpp';
  if (extension === 'java')
    return 'ace/mode/java';
  if (extension === 'm')
    return 'ace/mode/matlab';
  if (extension === 'json')
    return 'ace/mode/json';
  if (extension === 'xml')
    return 'ace/mode/xml';
  if (extension === 'yaml')
    return 'ace/mode/yaml';
  if (extension === 'ini')
    return 'ace/mode/ini';
  if (extension === 'html')
    return 'ace/mode/html';
  if (extension === 'js')
    return 'ace/mode/javascript';
  if (extension === 'css')
    return 'ace/mode/css';
  return 'ace/mode/text';
};

webots.Editor.prototype.addFile = function(filename, content) {
  var index = this.filenames.indexOf(filename);
  if (index >= 0) {
    this.needToUploadFiles[index] = false; // just received from the simulation server
    this.sessions[index].setValue(content);
    if ($('#filename-' + index).html().endsWith('*'))
      $('#filename-' + index).html(filename);
    if (webots.User1Authentication && webots.User1Id)
      this.storeUserFile(index);
    return;
  }

  index = this.filenames.length;
  this.filenames.push(filename);
  this.needToUploadFiles[index] = false;
  if (index === 0) {
    this.sessions[index].setMode(this.aceMode(filename));
    this.sessions[index].setValue(content);
    $('#webotsEditorMenu').show();
    $('#webotsEditorTabs').show();
  } else
    this.sessions.push(ace.createEditSession(content, this.aceMode(filename)));
  var that = this;
  this.sessions[index].on('change', function(e) { that.textChange(index); });
  $('div#webotsEditorTabs ul').append('<li id="file-' + index + '"><a href="#webotsEditorTab" id="filename-' + index + '">' + filename + '</a></li>');
  $('div#webotsEditorTabs').tabs('refresh');
  if (index === 0)
    $('div#webotsEditorTabs').tabs('option', 'active', index);
};

webots.Editor.prototype.closeAllTabs = function() {
  this.editor.setSession(ace.createEditSession('', ''));
  this.filenames = [];
  this.needToUploadFiles = [];
  this.sessions = [];
  this.sessions[0] = this.editor.getSession();
  this.currentSession = 0;
  $('div#webotsEditorTabs ul').empty();
  $('#webotsEditorMenu').hide();
  $('#webotsEditorTabs').hide();
};

webots.Console = function(parent, mobile) {
  function closeConsole() {
    $('#consoleButton').removeClass('toolBarButtonActive');
  }
  this.panel = document.createElement('div');
  this.panel.id = 'webotsConsole';
  this.panel.className = 'webotsConsole';
  parent.appendChild(this.panel);
  var clampedSize = webotsClampDialogSize({left: 0, top: 0, width: 600, height: 400});
  var params = {
    title: 'Console',
    resizeStart: webotsDisablePointerEvents,
    resizeStop: webotsEnablePointerEvents,
    dragStart: webotsDisablePointerEvents,
    dragStop: webotsEnablePointerEvents,
    width: clampedSize.width,
    height: clampedSize.height,
    autoOpen: false,
    appendTo: parent,
    close: closeConsole,
    open: webotsOpenDialog
  };
  if (mobile)
    webotsAddMobileDialogAttributes(params, this.panel);
  $(this.panel).dialog(params).dialogExtend({maximizable: mobile});
};

webots.Console.prototype.scrollDown = function() {
  if (this.panel)
    this.panel.scrollTop = this.panel.scrollHeight;
};

webots.Console.prototype.clear = function() {
  if (this.panel) {
    while (this.panel.firstChild)
      this.panel.removeChild(this.panel.firstChild);
  } else
    console.clear();
};

webots.Console.prototype.log = function(message, type) {
  var para = document.createElement('p');
  var style = 'margin:0;';
  var title = '';
  switch (type) {
    case 0:
      style += 'color:Blue;';
      title = 'Webots stdout';
      break;
    case 1:
      style += 'color:Red;';
      title = 'Webots stderr';
      break;
    case 2:
      style += 'color:Gray;';
      title = 'info';
      break;
    case 3:
      style += 'color:Salmon;';
      title = 'error';
      break;
  }
  if (this.panel) {
    para.style.cssText = style;
    para.title = title + ' (' + hourString() + ')';
    var t = document.createTextNode(message);
    para.appendChild(t);
    this.panel.appendChild(para);
    this.scrollDown();
  } else
    console.log('%c' + message, style);
  function hourString() {
    var d = new Date();
    return d.getHours() + ':' +
         ((d.getMinutes() < 10) ? '0' : '') + d.getMinutes() + ':' +
         ((d.getSeconds() < 10) ? '0' : '') + d.getSeconds();
  }
};

webots.Console.prototype.stdout = function(message) {
  this.log(message, 0);
};

webots.Console.prototype.stderr = function(message) {
  this.log(message, 1);
};

webots.Console.prototype.info = function(message) {
  this.log(message, 2);
};

webots.Console.prototype.error = function(message) {
  this.log(message, 3);
};

webots.HelpWindow = function(parent, webotsDocUrl, mobile) {
  function closeConsole() {
    $('#helpButton').removeClass('toolBarButtonActive');
  }
  function finalize() {
    $('#webotsHelpTabs').tabs('refresh');
    $('#webotsHelpTabs').tabs('option', 'active', 0);
    $(that.panel).dialog('open');
  }
  var that = this;
  this.name = name;
  this.panel = document.createElement('div');
  this.panel.id = 'webotsHelp';
  that.panel.style.overflow = 'hidden';
  this.panel.className += 'webotsTabContainer';
  this.tabs = document.createElement('div');
  this.tabs.id = 'webotsHelpTabs';
  this.tabs.className += 'webotsTabs';
  this.tabsHeader = document.createElement('ul');
  this.tabs.appendChild(this.tabsHeader);
  this.panel.appendChild(this.tabs);
  parent.appendChild(this.panel);
  var clampedSize = webotsClampDialogSize({left: 5, top: 5, width: 600, height: 600});
  var params = {
    title: 'Help',
    resizeStart: webotsDisablePointerEvents,
    resizeStop: webotsEnablePointerEvents,
    dragStart: webotsDisablePointerEvents,
    dragStop: webotsEnablePointerEvents,
    autoOpen: false,
    appendTo: parent,
    close: closeConsole,
    open: webotsOpenDialog,
    position: {at: 'right-5 top+5', my: 'right top', of: parent},
    width: clampedSize.width,
    height: clampedSize.height
  };
  if (mobile)
    webotsAddMobileDialogAttributes(params, this.panel);
  $(this.panel).dialog(params).dialogExtend({maximizable: mobile});

  if (webotsDocUrl) {
    var header = document.createElement('li');
    header.innerHTML = '<a href="#webotsHelpReference">Webots Reference Manual</a>';
    that.tabsHeader.appendChild(header);
    var page = document.createElement('div');
    page.id = 'webotsHelpReference';
    page.innerHTML = '<iframe src="' + webotsDocUrl + '"></iframe>';
    that.tabs.appendChild(page);
    $('#webotsHelpTabs').tabs();
  }

  $.ajax({
    url: webots.currentScriptPath() + 'help.php',
    success: function(data) {
      // we need to fix the img src relative URLs
      var html = data.replace(/ src="images/g, ' src="' + webots.currentScriptPath() + '/images');
      var header = document.createElement('li');
      header.innerHTML = '<a href="#webotsHelpGuide">User Guide</a>';
      $(that.tabsHeader).prepend(header);
      var page = document.createElement('div');
      page.id = 'webotsHelpGuide';
      page.innerHTML = html;
      if (document.getElementById('webotsHelpReference'))
        $('#webotsHelpReference').before(page);
      else {
        that.tabs.appendChild(page);
        $('#webotsHelpTabs').tabs();
      }
      finalize();
    },
    error: function() {
      finalize();
    }
  });
};

webots.RobotWindow = function(parent, name, mobile) {
  this.name = name;
  this.panel = document.createElement('div');
  this.panel.id = name;
  this.panel.className = 'webotsTabContainer';
  parent.appendChild(this.panel);
  var clampedSize = webotsClampDialogSize({left: 5, top: 5, width: 400, height: 400});
  var params = {
    title: 'Robot Window',
    resizeStart: webotsDisablePointerEvents,
    resizeStop: webotsEnablePointerEvents,
    dragStart: webotsDisablePointerEvents,
    dragStop: webotsEnablePointerEvents,
    autoOpen: false,
    appendTo: parent,
    open: webotsOpenDialog,
    position: {at: 'left+5 top+5', my: 'left top', of: parent},
    width: clampedSize.width,
    height: clampedSize.height
  };
  if (mobile)
    webotsAddMobileDialogAttributes(params, this.panel);
  $(this.panel).dialog(params).dialogExtend({maximizable: !mobile});
};

webots.RobotWindow.prototype.setProperties = function(properties) {
  $(this.panel).dialog(properties);
};

webots.RobotWindow.prototype.geometry = function() {
  var webotsTabs = this.panel.getElementsByClassName('webotsTabs');
  var activeTabIndex = -1;
  if (webotsTabs.length > 0)
    activeTabIndex = $(webotsTabs[0]).tabs('option', 'active');
  return {
    width: $(this.panel).dialog('option', 'width'),
    height: $(this.panel).dialog('option', 'height'),
    position: $(this.panel).dialog('option', 'position'),
    activeTabIndex: activeTabIndex,
    open: this.isOpen()
  };
};

webots.RobotWindow.prototype.restoreGeometry = function(data) {
  $(this.panel).dialog({
    width: data.width,
    height: data.height,
    position: data.position
  });
  var webotsTabs = this.panel.getElementsByClassName('webotsTabs');
  if (data.activeTabIndex >= 0 && webotsTabs.length > 0)
    $(webotsTabs[0]).tabs('option', 'active', data.activeTabIndex);
};

webots.RobotWindow.prototype.destroy = function() {
  this.close();
  this.panel.parentNode.removeChild(this.panel);
  this.panel = null;
};

webots.RobotWindow.prototype.setContent = function(content) {
  $(this.panel).html(content);
};

webots.RobotWindow.prototype.open = function() {
  $(this.panel).dialog('open');
};

webots.RobotWindow.prototype.isOpen = function() {
  return $(this.panel).dialog('isOpen');
};

webots.RobotWindow.prototype.close = function() {
  $(this.panel).dialog('close');
};

webots.RobotWindow.prototype.send = function(message, robot) {
  webots.currentView.stream.socket.send('robot:' + robot + ':' + message);
  if (webots.currentView.real_timeButton.style.display === 'inline') // if paused, make a simulation step
    webots.currentView.stream.socket.send('step'); // so that the robot controller handles the message
  // FIXME: there seems to be a bug here: after that step, the current time is not incremented in the web interface,
  // this is because the next 'application/json:' is not received, probably because it gets overwritten by the
  // answer to the robot message...
};

webots.RobotWindow.prototype.receive = function(message, robot) { // to be overriden
  console.log("Robot window '" + this.name + "' received message from Robot '" + robot + "': " + message);
};

webots.window = function(name) {
  var win = webots.currentView.robotWindows[name];
  if (!win)
    console.log("Robot window '" + name + "' not found.");
  return win;
};

webots.alert = function(title, message, callback) {
  webots.currentView.ondialogwindow(true);
  var parent = webots.currentView.view3D;
  var panel = document.getElementById('webotsAlert');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'webotsAlert';
    parent.appendChild(panel);
  }
  panel.innerHTML = message;
  $('#webotsAlert').dialog({
    title: title,
    resizeStart: webotsDisablePointerEvents,
    resizeStop: webotsEnablePointerEvents,
    dragStart: webotsDisablePointerEvents,
    dragStop: webotsEnablePointerEvents,
    appendTo: parent,
    open: webotsOpenDialog,
    modal: true,
    width: 400, // enough room to display the social network buttons in a line
    buttons: {Ok: function() { $(this).dialog('close'); }},
    close: function() {
      if (callback !== undefined)
        callback();
      webots.currentView.ondialogwindow(false);
      $(this).remove();
    }
  });
};

webots.confirm = function(title, message, callback) {
  webots.currentView.ondialogwindow(true);
  var parent = webots.currentView.view3D;
  var panel = document.createElement('div');
  panel.id = 'webotsConfirm';
  panel.innerHTML = message;
  parent.appendChild(panel);
  $('#webotsConfirm').dialog({
    title: title,
    resizeStart: webotsDisablePointerEvents,
    resizeStop: webotsEnablePointerEvents,
    dragStart: webotsDisablePointerEvents,
    dragStop: webotsEnablePointerEvents,
    appendTo: parent,
    open: webotsOpenDialog,
    modal: true,
    width: 400, // enough room to display the social network buttons in a line
    buttons: {Ok: function() { $(this).dialog('close'); callback(); }, Cancel: function() { $(this).dialog('close'); }},
    close: function() { $(this).dialog('destroy').remove(); webots.currentView.ondialogwindow(false); }});
};

webots.parseMillisecondsIntoReadableTime = function(milliseconds) {
  var hours = (milliseconds + 0.9) / (1000 * 60 * 60);
  var absoluteHours = Math.floor(hours);
  var h = absoluteHours > 9 ? absoluteHours : '0' + absoluteHours;
  var minutes = (hours - absoluteHours) * 60;
  var absoluteMinutes = Math.floor(minutes);
  var m = absoluteMinutes > 9 ? absoluteMinutes : '0' + absoluteMinutes;
  var seconds = (minutes - absoluteMinutes) * 60;
  var absoluteSeconds = Math.floor(seconds);
  var s = absoluteSeconds > 9 ? absoluteSeconds : '0' + absoluteSeconds;
  var ms = Math.floor((seconds - absoluteSeconds) * 1000);
  if (ms < 10)
    ms = '00' + ms;
  else if (ms < 100)
    ms = '0' + ms;
  return h + ':' + m + ':' + s + ':' + ms;
};

// get the directory path to the currently executing script file
// for example: https://cyberbotics.com/wwi/8.6/
webots.currentScriptPath = function() {
  var scripts = document.querySelectorAll('script[src]');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src;
    var index = src.indexOf('?');
    if (index > 0)
      src = src.substring(0, index); // remove query string
    if (!src.endsWith('webots.js'))
      continue;
    index = src.lastIndexOf('/');
    return src.substring(0, index + 1);
  }
  return '';
};

// add startsWith() and endsWith() functions to the String prototype
if (typeof String.prototype.startsWith !== 'function') {
  String.prototype.startsWith = function(prefix) {
    return this.slice(0, prefix.length) === prefix;
  };
}

if (typeof String.prototype.endsWith !== 'function') {
  String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
  };
}
