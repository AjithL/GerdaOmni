var extension = (navigator.kaiosExtension || navigator.engmodeExtension)
var viewport = document.getElementById('viewport')

function reportError(str) {
  window.alert(str)
}

function checkFreePort(portNum) {
  let XHR = new XMLHttpRequest()
  XHR.open('GET', 'http://127.0.0.1:'+portNum, false)
  XHR.mozSystem = true
  XHR.mozAnon = true
  try {
    XHR.send()
  } catch(e) {
    return true
  }
  return !(XHR.status === 200)
}

function allocatePort() {
  let randomPort = Math.ceil(Math.random() * 20000 + 1024) | 0
  return checkFreePort(randomPort) ? randomPort : allocatePort() 
}

function stopPkg(portNum, cb) {
  let cmd = '/vendor/bin/stop-bundle ' + portNum
  let exec = extension.startUniversalCommand(cmd) 
  exec.onsuccess = cb
  exec.onerror = function(e) {
    reportError('Error stopping the app backend: ' + e.toString())
  }
}

function exitApp(portNum, cb) { 
  try {
    stopPkg(portNum, function() {
      cb(true)
    })
  }
  catch(e) {
    cb(true)
  }
}

function runPkg(packageFile, cb) {
  let portNum = allocatePort()
  let cmd = '/vendor/bin/launch-bundle "' + packageFile + '" ' + portNum
  let exec = extension.startUniversalCommand(cmd, true) 
  exec.onsuccess = function() {
    window.onunload = function() {
      exitApp(portNum, cb)
    }
    window.addEventListener('keydown', function(e) {
      if(e.key === 'Backspace') {
        e.preventDefault()
        if(confirm('Exit?')) {
          window.onunload()
        }
      }
    })
    var poller = setInterval(function(){
      if(!checkFreePort(portNum)) {
        clearInterval(poller)
        viewport.src = 'http://127.0.0.1:' + portNum
      }
    }, 400)
  }
  exec.onerror = function(e) {
    reportError('Error starting the app backend: ' + e.toString())
  }
}

navigator.mozSetMessageHandler('activity', function(activityRequest) {
  let option = activityRequest.source
  if(option.name === 'open' && (option.data.type === 'application/x-gerda-bundle' || option.data.type === 'application/zip')) {
    let fileName = option.data.filename
    let pathParts = fileName.split('/')
    let cardPath = pathParts[1]
    let realPrefix = cardPath === 'sdcard1' ? 'storage/sdcard' : 'storage/emulated'
    pathParts[1] = realPrefix
    fileName = pathParts.join('/')
    if(window.confirm('Run the '+fileName+' application?')) {
      runPkg(fileName, function(result) {
        activityRequest.postResult(result)
      })
    }
    else activityRequest.postResult(true)
  }
})
