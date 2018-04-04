const lolalStorFunc = (param, keyValue, callback) => {
    chrome.storage.local[param](keyValue, result => {
      param === 'set' ? console.log('Settings saved') : constLocalObj(result);
      if (callback) callback();
    });
  },
  localObj = {},
  docQ = (x) => document.querySelector(x),
  constLocalObj = result => {
    for (let i in result) localObj[i] = result[i];
  };

function saveOptions(e) {
  e.preventDefault();

  lolalStorFunc('set', {'hostname': docQ("#hostname").value});

  chrome.extension.getBackgroundPage().window.location.reload();

  docQ('.success').style.display = 'block';
  setTimeout(() => {
    docQ('.success').style.display = 'none';
  }, 3000)
}

function restoreOptions() {
  lolalStorFunc('get', ['hostname'], () => {
    docQ("#hostname").value = localObj.hostname || "apple-tv.local";
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
docQ('#save-settings').addEventListener('click', saveOptions);
