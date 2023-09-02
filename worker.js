const autoLock = () => chrome.storage.local.get({
  'minutes': 30,
  'mode': 'each-time'
}, prefs => {
  if (prefs['mode'] === 'time-based') {
    chrome.alarms.create('lock-me', {
      when: Date.now() + prefs.minutes * 60 * 1000
    });
  }
  else {
    chrome.alarms.clear('lock-me');
  }
});

const onMessage = (request, sender, response) => {
  if (request.cmd === 'close-me') {
    chrome.tabs.query({url: 'https://web.whatsapp.com/*'}).then(tabs => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          cmd: 'close-me'
        });
      }
    });
    autoLock();
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
  else if (request.cmd === 'get-alarm') {
    chrome.alarms.get('lock-me', response);
    return true;
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

    // remove unlock
    chrome.alarms.clear('lock-me');
  }
  else {
    chrome.tabs.create({
      url: 'https://web.whatsapp.com/',
      index: tab.index + 1
    });
  }
});

chrome.alarms.onAlarm.addListener(({name}) => {
  if (name === 'lock-me') {
    chrome.storage.local.get({
      'auto-lock': false
    }, prefs => {
      if (prefs['auto-lock']) {
        onMessage({
          cmd: 'lock-me'
        });
      }
    });
  }
});

// idle
{
  const start = () => chrome.storage.local.get({
    'idle-timeout': 10
  }, prefs => {
    chrome.idle.setDetectionInterval(prefs['idle-timeout'] * 60);
  });
  chrome.runtime.onStartup.addListener(start);
  chrome.runtime.onInstalled.addListener(start);
}
chrome.idle.onStateChanged.addListener(state => {
  if (state === 'idle' || state === 'locked') {
    chrome.storage.local.get({
      'idle': true
    }, prefs => {
      if (prefs.idle) {
        onMessage({
          cmd: 'lock-me'
        });
      }
    });
  }
});

chrome.storage.onChanged.addListener(ps => {
  if (ps['idle-timeout']) {
    chrome.idle.setDetectionInterval(ps['idle-timeout'].newValue * 60);
  }
  if (ps['minutes'] || ps['mode']) {
    autoLock();
  }
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
