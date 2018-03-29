const lolalStorFunc = (param, keyValue, callback) => {
    chrome.storage.local[param](keyValue, result => {
      param === 'set' ? console.log('Settings saved') : constLocalObj(result);
      if (callback) callback();
    });
  },
  localObj = {},
  constLocalObj = result => {
    for (let i in result) localObj[i] = result[i];
  },
  docQ = (x) => document.querySelector(x);

lolalStorFunc('set', {'isPlaying': false});

const getCurrentTime = () => parseInt(docQ('.ytp-progress-bar').getAttribute('aria-valuenow'));
const getCurrentPercent = () => {
  const value = v => parseInt(docQ('.ytp-progress-bar').getAttribute(`aria-${v}`));
  return (value('valuenow') * 100) / value('valuemax') / 100;
};

function createBtn() {
  console.log('create btn');
  const btn = document.createElement('button');
  btn.classList.add('ytp-button');
  btn.style.cssText = 'background-size:cover; background-image: url(https://image.flaticon.com/icons/png/128/565/565221.png)';
  const fullscreenBtn = docQ('.ytp-fullscreen-button.ytp-button');
  fullscreenBtn.parentNode.insertBefore(btn, fullscreenBtn);
  btn.addEventListener('click', () => {
    lolalStorFunc('set', {'isPlaying': true});
    sendToTV({
      action: 'start',
      num: localObj.playPosition === '0' ? 0 : getCurrentPercent()
    });
  })
}

function sendToTV(cmd) {
  chrome.extension.sendMessage({
    href: location.href,
    msg: 'action',
    cmd
  });
}

if (docQ('.ytp-fullscreen-button.ytp-button')) {
  createBtn();
  const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

  const play_pause = docQ('.ytp-play-button.ytp-button');
  const volume = docQ('.ytp-volume-panel');
  const next = docQ('.ytp-upnext');

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {

      if (mutation.type === "attributes") {
        console.log('\n\n\n', 'attributes changed', '\n\n\n\n');

        lolalStorFunc('get', ['isPlaying'], () => {
          if (localObj.isPlaying) {
            const classL = mutation.target.classList;

            if (classL.contains('ytp-play-button')) {
              sendToTV({
                action: play_pause.getAttribute('aria-label') === 'Play' ? 'pause' : 'scrub',
                num: getCurrentTime()
              })
            }
            else if (classL.contains('ytp-upnext') && classL.contains('ytp-suggestion-set')) {
              let click;
              next.addEventListener('click', () => {
                click = true;
                sendToTV({
                  action: 'start',
                  num: localObj.playPosition === '0' ? 0 : getCurrentPercent()
                })
              });
              setTimeout(function () {
                if(!click) sendToTV({
                  action: 'start',
                  num: localObj.playPosition === '0' ? 0 : getCurrentPercent()
                })
              }, 10000)
            }
            else if (classL.contains('ytp-volume-panel')) {
              sendToTV({
                action: 'volume',
                num: volume.getAttribute('aria-valuenow')
              })
            }
          }
        });
      }
    });
  });

  observer.observe(play_pause, {attributes: true});
  // observer.observe(volume, {attributes: true, attributeFilter: ['aria-valuenow']});
  observer.observe(next, {attributes: true, attributeFilter: ['class']});
}

chrome.storage.onChanged.addListener(() => lolalStorFunc('get', ['hostname', 'playPosition']));
