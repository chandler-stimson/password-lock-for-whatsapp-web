const run = forced => chrome.storage.local.get({
  mode: 'each-time',
  minutes: 30
}, async prefs => {
  if (prefs.mode === 'time-based' && forced !== true) {
    const o = await new Promise(resolve => chrome.runtime.sendMessage({
      cmd: 'get-alarm'
    }, resolve));

    if (o) {
      if (o.scheduledTime - Date.now() > 0) {
        return;
      }
      else {
        chrome.alarms.clear('lock-me');
      }
    }
  }
  if (!document.querySelector('dialog.pbfww')) {
    // open dialog
    const dialog = document.createElement('dialog');
    dialog.style = `
      padding: 0;
      border: none;
      max-width:100%;
      max-height: 100%;
      overflow: hidden;
      background-color: transparent;
    `;
    dialog.classList.add('pbfww');
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('/data/lock/index.html');
    iframe.style = `
      border: none;
      width: 100vw;
      height: 100vh;
    `;
    dialog.append(iframe);

    document.documentElement.append(dialog);
    dialog.showModal();

    document.documentElement.classList.add('bgblurrify');
  }
});
run();

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.cmd === 'close-me') {
    document.documentElement.classList.remove('bgblurrify');
    // remove old blockers
    for (const e of document.querySelectorAll('dialog.pbfww')) {
      e.remove();
    }
  }
  else if (request.cmd === 'lock-me') {
    run(true);
    response(true);
  }
});
