const notify = msg => {
  alert(msg);
  document.getElementById('password').focus();
};

const check = async () => {
  const password = document.getElementById('password').value;
  const s = await check.hash(password);

  return new Promise((resolve, reject) => {
    chrome.storage.local.get({
      hash: ''
    }, prefs => prefs.hash === s ? resolve() : reject(Error('NO_MATCH')));
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
  'current': 0,
  'minutes': 30,
  'hash': '',
  'auto-lock': true
}, prefs => {
  document.getElementById(prefs.mode).checked = true;
  document.getElementById('minutes').value = prefs.minutes;
  document.getElementById('auto-lock').checked = prefs['auto-lock'];

  document.body.classList[prefs.hash ? 'add' : 'remove']('hash');
});

document.getElementById('reset').onclick = () => {
  check().then(() => {
    document.body.classList.remove('hash');
  }).catch(() => notify('Enter the old password first'));
};

const save = () => chrome.storage.local.set({
  'mode': document.querySelector('[name=mode]:checked').id,
  'minutes': Math.max(1, document.getElementById('minutes').valueAsNumber ?? 30),
  'current': Date.now(),
  'auto-lock': document.getElementById('auto-lock').checked
});

document.addEventListener('submit', e => {
  const password = document.getElementById('password').value;
  if (e.submitter && e.submitter.id === 'change') {
    const p = document.getElementById('password-check').value;

    if (password === p) {
      check.hash(password).then(hash => chrome.storage.local.set({
        hash
      }, () => {
        document.body.classList.add('hash');
        document.getElementById('password').dispatchEvent(new Event('input'));
      }));
    }
    else {
      notify('Passwords do not match!');
    }
  }
  else {
    check().then(() => {
      save();

      chrome.runtime.sendMessage({
        cmd: 'close-me'
      }).catch(() => notify('Password is incorrect'));
    });
  }
  e.preventDefault();
});

document.getElementById('options').onchange = () => {
  check().then(save).catch(() => notify('Wrong password! Your changes are ignored'));
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('password').focus();
});


document.getElementById('password').oninput = () => check().then(
  () => document.getElementById('options').classList.remove('hidden'),
  () => document.getElementById('options').classList.add('hidden')
);
