const onMessage = request => {
  if (request.cmd === 'close-me') {
    chrome.tabs.query({url: 'https://web.whatsapp.com/*'}).then(tabs => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          cmd: 'close-me'
        });
      }
    });
  }
  else if (request.cmd === 'lock-me') {
    chrome.tabs.query({url: 'https://web.whatsapp.com/*'}).then(tabs => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          cmd: 'lock-me'
        }, () => {
          const lastError = chrome.runtime.lastError;

          if (lastError) {
            chrome.tabs.reload(tab.id);
          }
        });
      }
    });
  }
};
chrome.runtime.onMessage.addListener(onMessage);

chrome.action.onClicked.addListener(async tab => {
  const tabs = await chrome.tabs.query({url: 'https://web.whatsapp.com/*'});

  // lock tabs when there is an open one
  if (tabs.length) {
    onMessage({
      cmd: 'lock-me'
    });

    // highlight
    if (tabs.includes(tab) === false) {
      chrome.windows.update(tabs[0].windowId, {
        focused: true
      });
      chrome.tabs.update(tabs[0].id, {
        active: true
      });
    }
  }
  else {
    chrome.tabs.create({
      url: 'https://web.whatsapp.com/',
      index: tab.index + 1
    });
  }
});

chrome.storage.onChanged.addListener(ps => {
  if (ps.current) {
    chrome.storage.local.get({
      mode: 'each-time',
      current: 0,
      minutes: 30
    }, prefs => {
      if (prefs.mode === 'time-based') {
        chrome.alarms.create('lock-me', {
          when: prefs.current + prefs.minutes * 60 * 1000
        });
      }
    });
  }
});

chrome.alarms.onAlarm.addListener(({name}) => {
  if (name === 'lock-me') {
    chrome.storage.local.get({
      'auto-lock': true
    }, prefs => {
      if (prefs['auto-lock']) {
        onMessage({
          cmd: 'lock-me'
        });
      }
    });
  }
});
