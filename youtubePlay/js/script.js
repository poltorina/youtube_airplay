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
  docQ = (x) => document.querySelector(x),
  docQAll = (x) => document.querySelectorAll(x);

function debounce(func, wait, immediate) {
  let timeout;
  return () => {
    const context = this, args = arguments;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}


lolalStorFunc('get', ['needPlayVideo'], () => {
  if (localObj.needPlayVideo)
    sendToTV({
      action: 'start',
      num: getCurrentPercent()
    })
});
lolalStorFunc('set', {'isPlaying': false, 'needPlayVideo': false});

const getCurrentTime = () => parseInt(docQ('.ytp-progress-bar').getAttribute('aria-valuenow'));
const getCurrentPercent = () => {
  const value = v => parseInt(docQ('.ytp-progress-bar').getAttribute(`aria-${v}`));
  return (value('valuenow') * 100) / value('valuemax') / 100;
};
const setTime = debounce(() =>
    sendToTV({
      action: 'scrub',
      num: getCurrentTime()
    })
  , 500);


function init() {
  const play_pause = docQ('.ytp-play-button.ytp-button');
  const volume = docQ('.ytp-volume-panel');
  const next = docQ('.ytp-next-button');
  const player = docQ('.html5-video-player');
  const bezel = docQ('.ytp-bezel');
  const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

  let videoWasEnd;
  let state = {

  };

  function createContextMenu(left, top) {
    [...docQAll('.yt-airplay-ext-popup')].forEach(el => el.remove());
    console.log('create context menu');
    const btn = document.createElement('div');
    btn.classList.add('yt-airplay-ext-popup');
    btn.innerHTML = state.play ?
      ''
      : '<div style="font-family: Helvetica;font-size: 15px;padding: 6px 20px;border-bottom: 1.5px solid #ccc;color: #888;">AirPlay to:</div>' +
      '';
    btn.style.cssText = `position: absolute;width: 230px;height: 100px;background: #ddd;z-index: 1000000;border-radius: 6px;border: 1px solid #bbb;box-shadow: 0 1px 18px 0 rgba(0,0,0,0.4); top: ${top}px; left: ${left}px`;
    document.body.appendChild(btn);
  }

  function createBtn() {
    console.log('create btn');
    [...docQAll('.yt-airplay-ext')].forEach(el => el.remove());
    const btn = document.createElement('button');
    btn.classList.add('ytp-button', 'yt-airplay-ext');
    btn.style.cssText = "background-size:cover; background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAMAAADDpiTIAAAAnFBMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+TINBkAAAAM3RSTlMAEe79CgP5xAbM9ubY8esfGTEVvYNSRg62KyOaj3xdPCfe06GJcGnhsVhMQTendmOslfMZnYj6AAAJNklEQVR42uzBAQ0AAAwCoHd6/27WcA44AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJj19Am7dZJaZRRFYXTjezGJpIIUkIJ0bNvxzn9uigTR6IFHIOHe/6w1hM3X2KkJoIPUBNBBagLoIDUBdJCaADpITQAdpCaADlITQAepCaCD1ATQQWoC6CA1AXSQmgA6SE0AHaQmgA5SE0AHqQmgg9QE0EFqAuggNQF0kJoAOkhNAB2kJoAOUhNAB6kJoIPUPjaAT2/webCZAML7mWR3ARxMAAgAASAABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAAXQ3ye4COJgAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEAAC6G6S3QVwMAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEMC7u7rKWibZfSsBHF1fH2Upk+y+lQBuxrjJUibZfSMB3O3G2N1lJZPsvo0ALi/GTxeXWcgku28igJPj8cvxSdYxye6bCOBpvHjKOibZfQsB3O7Gi91tljHJ7hsI4OF8/Hb+kFVMsvv6AexPxx9O91nEJLuvH8Dj+MtjFjHJ7ssH8Dxeec4aJtl99QDuv49XvtxnCZPsvngA+7Pxj7M1bsAkuy8ewNfxH9+ygh/snYtS2lAURQ8EUEDl0VqwFZHyrvXV/f//1hk704cQc1KSsHd71ifsWa0x3nVDsru2ACvsZWUCkOwuLcCgg720BsYPye7KAoxmSGE2MnpIdlcW4Amp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')";
    const fullscreenBtn = docQ('.ytp-fullscreen-button.ytp-button');
    fullscreenBtn.parentNode.insertBefore(btn, fullscreenBtn);
    btn.addEventListener('click', e => {
      createContextMenu(e.clientX, e.clientY);
      setTimeout(function () {
        player.classList.remove('ytp-autohide')
      }, 1000)
      // lolalStorFunc('set', {'isPlaying': true});
      // sendToTV({
      //   action: 'start',
      //   num: getCurrentPercent()
      // });
    })
  }


  createBtn();


  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "attributes") {
        // console.log('\n\n\n', 'attributes changed', mutation, '\n\n\n\n');

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
              next.addEventListener('click', e => {
                click = true;
                sendToTV({
                  action: 'start',
                  num: getCurrentPercent()
                }, e.target.href)
              });
              setTimeout(function () {
                if (!click) sendToTV({
                  action: 'start',
                  num: getCurrentPercent()
                })
              }, 10000)
            }
            else if (classL.contains('html5-video-player')) {
              if (classL.contains('ended-mode') || (classL.contains('unstarted-mode') && !classL.contains('playing-mode'))) videoWasEnd = true;

              if (videoWasEnd && classL.contains('playing-mode')) {
                videoWasEnd = false;
                sendToTV({
                  action: 'start',
                  num: getCurrentPercent()
                })
              }
            }
            else if (classL.contains('ytp-bezel')) {
              if (mutation.target.getAttribute('aria-label') === '') setTime()
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
  observer.observe(player, {attributes: true, attributeFilter: ['class']});
  observer.observe(bezel, {attributes: true, attributeFilter: ['style']});

  [...docQAll('.ytp-ce-covering-overlay[href^="/watch"]')].forEach(el =>
    el.addEventListener('click', () => lolalStorFunc('set', {'needPlayVideo': true}))
  );

  next.addEventListener('click', e =>
    sendToTV({
      action: 'start',
      num: '0'
    }, e.target.href)
  );
}

function sendToTV(cmd, href) {
  chrome.extension.sendMessage({
    href: href ? href : location.href,
    msg: 'action',
    cmd
  });
}

chrome.runtime.onMessage.addListener(() => {
  console.warn('\n\n\n111\n\n\n', !docQ('.yt-airplay-ext'));
  if (docQ('.ytp-fullscreen-button.ytp-button')) init();
});

chrome.storage.onChanged.addListener(() => lolalStorFunc('get', ['hostname']));
