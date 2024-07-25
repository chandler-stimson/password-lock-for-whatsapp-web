const notify = (msg, timeout = 3000) => {
  document.getElementById('notify').notify(msg, 'error', timeout);
  document.getElementById('password').focus();
};

const check = async () => {
  const password = document.getElementById('password').value;
  const s = await check.hash(password);

  return new Promise((resolve, reject) => {
    chrome.storage.local.get({
      hash: ''
    }, prefs => prefs.hash === s ? resolve() : reject(Error(prefs.hash ? 'NO_MATCH' : 'NO_PASSWORD_IS_SET')));
  });
};
check.hash = async password => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);

  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

chrome.storage.local.get({
  'mode': 'each-time',
  'minutes': 30,
  'hash': '',
  'auto-lock': false,
  'idle-timeout': 10,
  'idle': true,
  'context-lock': true
}, prefs => {
  document.body.dataset.mode = prefs.mode;
  document.getElementById(prefs.mode).checked = true;
  document.getElementById('minutes').value = prefs.minutes;
  document.getElementById('auto-lock').checked = prefs['auto-lock'];
  document.getElementById('idle').checked = prefs.idle;
  document.getElementById('idle-timeout').value = prefs['idle-timeout'];
  document.getElementById('context-lock').checked = prefs['context-lock'];

  document.body.classList[prefs.hash ? 'add' : 'remove']('hash');

  if (!prefs.hash) {
    document.getElementById('password').placeholder = 'Enter New Password';
  }
});

document.getElementById('reset').onclick = () => {
  check().then(() => {
    document.body.classList.remove('hash');
  }).catch(() => notify('Enter the old password first'));
};

const save = () => {
  const mode = document.querySelector('[name=mode]:checked').id;
  document.body.dataset.mode = mode;

  chrome.storage.local.set({
    mode,
    'minutes': Math.max(1, document.getElementById('minutes').valueAsNumber ?? 30),
    'idle-timeout': Math.max(1, document.getElementById('idle-timeout').valueAsNumber ?? 10),
    'auto-lock': document.getElementById('auto-lock').checked,
    'idle': document.getElementById('idle').checked,
    'context-lock': document.getElementById('context-lock').checked
  });
};

document.addEventListener('submit', async e => {
  const password = document.getElementById('password').value;
  const p = document.getElementById('password-check').value;
  e.preventDefault();

  if (e.submitter && e.submitter.id === 'enter') {
    try {
      await check();
      save();

      chrome.runtime.sendMessage({
        cmd: 'close-me'
      });
    }
    catch (e) {
      console.info('[Error]', e);
      // maybe the user is trying to save the password
      if (!password || password !== p) {
        return notify('Password is incorrect: ' + e.message);
      }
    }
  }
  if (password === '') {
    notify('Password cannot be empty');
  }
  else if (password === p) {
    const hash = await check.hash(password);

    chrome.storage.local.set({
      hash
    }, () => {
      document.body.classList.add('hash');
      document.getElementById('password').dispatchEvent(new Event('input'));
      if (e.submitter && e.submitter.id === 'enter') {
        e.submitter.click();
      }
    });
  }
  else {
    notify('Passwords do not match!');
  }
});

document.getElementById('options').onchange = () => {
  check().then(save).catch(() => notify('Wrong password! Your changes are ignored'));
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('password').focus();
});

document.getElementById('settings').onclick = () => check().then(() => {
  document.getElementById('options').classList.toggle('hidden');
}).catch(e => notify(e.message === 'NO_PASSWORD_IS_SET' ? 'Set the password, then retry' : 'Password is incorrect'));

// prevent context menu
{
  let locked = true;
  chrome.storage.local.get({
    'context-lock': locked
  }, prefs => locked = prefs['context-lock']);
  chrome.storage.onChanged.addListener(ps => {
    if (ps['context-lock']) {
      locked = ps['context-lock'].newValue;
    }
  });

  document.addEventListener('contextmenu', e => {
    if (locked) {
      notify(e.target.id === 'password' ?
        'Use Ctrl + V or Command + V to paste' : 'Please unlock WhatsApp for right-click to work'
      );
      e.preventDefault();
    }
  });
}
