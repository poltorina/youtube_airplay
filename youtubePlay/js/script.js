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
const inputChange = debounce(() => {
    let value = docQ('.yt-airplay-ext-popup .popup-select input').value;
    docQ('.yt-airplay-ext-popup .popup-select span').innerText = value;
    lolalStorFunc('set', {'hostname': value})
  }
  , 500);
let state = {};

function init() {
  const play_pause = docQ('.ytp-play-button.ytp-button');
  const volume = docQ('.ytp-volume-panel');
  const next = docQ('.ytp-next-button');
  const player = docQ('.html5-video-player');
  const bezel = docQ('.ytp-bezel');
  const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

  let videoWasEnd;

  function addStyle(styles, selector) {
    [...docQAll(selector)].forEach(el => el.remove());
    let styleTag = document.createElement('style');
    styleTag.id = 'yt-airplay-ext-style';
    if (styleTag.styleSheet) styleTag.styleSheet.cssText = styles;
    else
      styleTag.appendChild(document.createTextNode(styles));

    document.getElementsByTagName('head')[0].appendChild(styleTag);
  }

  function removeContextMenu() {
    [...docQAll('.yt-airplay-ext-popup')].forEach(el => el.remove());
  }

  function createContextMenu(left, top) {
    let hostname = localObj.hostname || 'apple-tv.local';
    removeContextMenu();
    console.log('create context menu');
    const menu = document.createElement('div');
    menu.classList.add('yt-airplay-ext-popup');
    menu.innerHTML = `
        <div class="popup-title popup-elem popup-select popup-stopPlay ${state.play ? '' : 'yt-airplay-ext-hidden'}">Turn off AirPlay</div>
        <div class=" ${state.play ? '' : 'popup-title'} popup-elem popup-grey">AirPlay to:</div>
        <div style="position: relative;">
          <div class="popup-elem  ${state.play ? '' : 'popup-select'}">
            <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" class="style-scope yt-icon ${state.play ? '' : 'yt-airplay-ext-hidden'}"
                 style="height: 20px; left:3px;top: 5px;position: absolute;">
              <g class="style-scope yt-icon">
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 17 7l-1.1-1.4L9 16.2z" class="style-scope yt-icon"></path>
              </g>
            </svg>
            <span style="display: block;">${hostname}</span>
            <input style="display: none;" value="${hostname}" type="text" id="yt-airplay-hostname">
            <div class="edit-hostname ${state.play ? 'yt-airplay-ext-hidden' : ''}">
              <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" class="style-scope yt-icon"
                   style="pointer-events: none; width: 100%; height: 100%;">
                <g class="style-scope yt-icon">
                  <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.1-1.65c.2-.15.25-.42.13-.64l-2-3.46c-.12-.22-.4-.3-.6-.22l-2.5 1c-.52-.4-1.08-.73-1.7-.98l-.37-2.65c-.06-.24-.27-.42-.5-.42h-4c-.27 0-.48.18-.5.42l-.4 2.65c-.6.25-1.17.6-1.7.98l-2.48-1c-.23-.1-.5 0-.6.22l-2 3.46c-.14.22-.08.5.1.64l2.12 1.65c-.04.32-.07.65-.07.98s.02.66.06.98l-2.1 1.65c-.2.15-.25.42-.13.64l2 3.46c.12.22.4.3.6.22l2.5-1c.52.4 1.08.73 1.7.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.6-.25 1.17-.6 1.7-.98l2.48 1c.23.1.5 0 .6-.22l2-3.46c.13-.22.08-.5-.1-.64l-2.12-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" class="style-scope yt-icon"></path>
                </g>
              </svg>
            </div>
          </div>
        </div>`;
    let styles = {
      s: `
      .yt-airplay-ext-hidden {
          display: none;
      }
      .yt-airplay-ext-popup {
          position: absolute;
          min-width: 200px;
          background: rgb(221, 221, 221);
          z-index: 1000000;
          border-radius: 6px;
          border: 1px solid rgb(187, 187, 187);
          box-shadow: rgba(0, 0, 0, 0.4) 0px 1px 18px 0px;
          padding: 3px 0;
          top: ${top}px; 
          left: ${left}px;
      }
      .yt-airplay-ext-popup .popup-elem {
          font-family: Helvetica;
          font-size: 15px;
          padding: 6px 20px;
          color: #000;
          height: 17px;
      }
      .yt-airplay-ext-popup .popup-select {
          cursor: pointer;
      }
      .yt-airplay-ext-popup .popup-select span {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          padding: 6px 20px;
          box-sizing: border-box;
      }
      .yt-airplay-ext-popup .popup-select:hover {
          color: #fff;
          background-color: #2073D6;
      }
      .yt-airplay-ext-popup .popup-select input[style="display: block;"] + .edit-hostname svg {
          display: none;
      }
      .yt-airplay-ext-popup .popup-select:hover svg {
          fill: #fff;
      }
      .yt-airplay-ext-popup .popup-title {
          border-bottom: 1.5px solid #ccc;
      }
      .yt-airplay-ext-popup .popup-grey {
          color: #888;
          cursor: default;
      }
      .yt-airplay-ext-popup .edit-hostname {
          position: absolute;
          width: 15px;
          height: 15px;
          top: 8px;
          right: 17px;
          cursor: pointer;
      }
      .yt-airplay-ext-popup .popup-select input {
          position: absolute;
          left: 0;
          top: 0;
          padding: 6px 20px;
          font-size: 15px;
          background: rgb(221, 221, 221);
          border: none;
          width: 100%;
          box-sizing: border-box;
      }`
    };

    addStyle(styles.s, '#yt-airplay-context-style');
    document.body.appendChild(menu);

    function inputTrigger() {
      const span = docQ('.yt-airplay-ext-popup .popup-select span'),
        input = docQ('.yt-airplay-ext-popup .popup-select input');
      span.style.display = span.style.display === 'block' ? 'none' : 'block';
      input.style.display = input.style.display === 'block' ? 'none' : 'block';
      if (input.style.display === 'block') input.focus();
    }

    function bodyClickListener(e) {
      if (!e.target.classList.contains('yt-airplay-ext-popup') &&
        !e.target.classList.contains('yt-airplay-ext') &&
        !e.target.closest('.yt-airplay-ext-popup')) {
        removeContextMenu();
        document.body.removeEventListener('click', bodyClickListener);
      }
    }

    function listen(el, event, callback) {
      if (docQ(el)) {
        docQ(el).addEventListener(event, callback);
      } else {
        console.warn(`listen: Can't find element ${el}!`)
      }
    }

    listen('.yt-airplay-ext-popup .popup-select input', 'keyup', inputChange);
    listen('.yt-airplay-ext-popup .popup-select input', 'focusout', inputTrigger);
    listen('.yt-airplay-ext-popup .edit-hostname', 'click', inputTrigger);
    listen('.yt-airplay-ext-popup .popup-stopPlay', 'click', () => {
      removeContextMenu();
      sendToTV({action: 'stop'})
    });

    document.body.addEventListener('click', bodyClickListener);
    listen('.yt-airplay-ext-popup .popup-select span', 'click', () => {
      removeContextMenu();
      lolalStorFunc('set', {'isPlaying': true});
      sendToTV({
        action: 'start',
        num: getCurrentPercent()
      });
    });
  }

  function createLayer() {
    [...docQAll('.yt-airplay-layer')].forEach(el => el.remove());
    const layer = document.createElement('div');
    layer.classList.add('yt-airplay-layer');
    layer.innerHTML =
      `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJUAAABoCAMAAADPcEK6AAAAPFBMVEUAAACkpKQYGBhSUlJycnIHBwdXV1eampouLi4kJCSfn59nZ2dsbGwfHx99fX0LCwuTk5NJSUlAQEAqKipjd0VlAAAAxklEQVRo3u3bSQ6DMBQEUWMwmc10/7tGLNlVJCv5KPVOUIvedtL5bX0sW9ot8yWUvuxV/b0LZQxeNdchgjofqup6i2Cth6rhlSLIT6usSskqzirOKs4qzirOKs4qzirOKs4qzirOKs4qzirOKs4qzirOKs4qzirOKs4qzirOKs4qzirOKs4qzirOKs4qzirOKs4qzirOKu4vq+pyjWCpJ/gCRGLVp1Ulx1KS9DO5rdREebQ1pRamrq1s1ZerythWaTT3pkjUGyqYMdPSH1byAAAAAElFTkSuQmCC">
     <div class="title">AirPlay</div>
     <div>This video is playing on your Apple TV</div>`;
    docQ('.html5-video-player').appendChild(layer);
  }

  function createBtn() {
    console.log('create btn');
    [...docQAll('.yt-airplay-ext')].forEach(el => el.remove());
    const btn = document.createElement('button');
    btn.innerHTML = '<div class="ytp-tooltip ytp-bottom"><div class="ytp-tooltip-text-wrapper"><span class="ytp-tooltip-text">Play on Apple TV</span></div></div>';
    btn.classList.add('ytp-button', 'yt-airplay-ext');
    const fullscreenBtn = docQ('.ytp-fullscreen-button.ytp-button');
    let styles = {
      s: `
      .ytp-button.yt-airplay-ext {
          background-size:cover; 
          font-size: 11px;
          position: relative;
          overflow: visible;
          background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAMAAADDpiTIAAAAnFBMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+TINBkAAAAM3RSTlMAEe79CgP5xAbM9ubY8esfGTEVvYNSRg62KyOaj3xdPCfe06GJcGnhsVhMQTendmOslfMZnYj6AAAJNklEQVR42uzBAQ0AAAwCoHd6/27WcA44AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJj19Am7dZJaZRRFYXTjezGJpIIUkIJ0bNvxzn9uigTR6IFHIOHe/6w1hM3X2KkJoIPUBNBBagLoIDUBdJCaADpITQAdpCaADlITQAepCaCD1ATQQWoC6CA1AXSQmgA6SE0AHaQmgA5SE0AHqQmgg9QE0EFqAuggNQF0kJoAOkhNAB2kJoAOUhNAB6kJoIPUPjaAT2/webCZAML7mWR3ARxMAAgAASAABIAAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAAXQ3ye4COJgAEAACQAAIAAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEAAC6G6S3QVwMAEgAASAABAAAkAACAABIAAEgAAQAAJAAAgAASAABIAAEMC7u7rKWibZfSsBHF1fH2Upk+y+lQBuxrjJUibZfSMB3O3G2N1lJZPsvo0ALi/GTxeXWcgku28igJPj8cvxSdYxye6bCOBpvHjKOibZfQsB3O7Gi91tljHJ7hsI4OF8/Hb+kFVMsvv6AexPxx9O91nEJLuvH8Dj+MtjFjHJ7ssH8Dxeec4aJtl99QDuv49XvtxnCZPsvngA+7Pxj7M1bsAkuy8ewNfxH9+ygh/snYtS2lAURQ8EUEDl0VqwFZHyrvXV/f//1hk704cQc1KSsHd71ifsWa0x3nVDsru2ACvsZWUCkOwuLcCgg720BsYPye7KAoxmSGE2MnpIdlcW4Amp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');
      }
      .ytp-button.yt-airplay-ext:hover .ytp-tooltip.ytp-bottom {
          display: block;
      }
      .ytp-button.yt-airplay-ext .ytp-tooltip.ytp-bottom {
          display: none;
          max-width: 300px;
          top: -39px;
          left: -45px;
          position: absolute;
          width: 117px;
      }
      .yt-airplay-layer {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          font-family: Helvetica;
          color: #ddd;
          font-size: 110%;
      }
      .yt-airplay-layer img {
          width: 150px;
      }
      .yt-airplay-layer div.title {
          font-size: 190%;
          padding-top: 8px;
      }
      `
    };
    addStyle(styles.s, '#yt-airplay-btn-style');
    fullscreenBtn.parentNode.insertBefore(btn, fullscreenBtn);
    btn.addEventListener('click', e => {
      createContextMenu(e.clientX, e.clientY);
      setTimeout(function () {
        player.classList.remove('ytp-autohide')
      }, 1000);
    })
    createLayer();
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

function changeState(play) {
  state.play = play;
  docQ('.html5-video-container').style.opacity = play ? 0 : 1;
  docQ('.yt-airplay-layer').style.opacity = play ? 1 : 0;
  docQ(".video-stream.html5-main-video").muted = play;
  docQ(".ytp-mute-button.ytp-button").disabled = play;
  docQ(".ytp-mute-button.ytp-button").innerHTML = play ?
    '<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%"><use class="ytp-svg-shadow" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ytp-id-65"></use><path class="ytp-svg-fill" d="m 21.48,17.98 c 0,-1.77 -1.02,-3.29 -2.5,-4.03 v 2.21 l 2.45,2.45 c .03,-0.2 .05,-0.41 .05,-0.63 z m 2.5,0 c 0,.94 -0.2,1.82 -0.54,2.64 l 1.51,1.51 c .66,-1.24 1.03,-2.65 1.03,-4.15 0,-4.28 -2.99,-7.86 -7,-8.76 v 2.05 c 2.89,.86 5,3.54 5,6.71 z M 9.25,8.98 l -1.27,1.26 4.72,4.73 H 7.98 v 6 H 11.98 l 5,5 v -6.73 l 4.25,4.25 c -0.67,.52 -1.42,.93 -2.25,1.18 v 2.06 c 1.38,-0.31 2.63,-0.95 3.69,-1.81 l 2.04,2.05 1.27,-1.27 -9,-9 -7.72,-7.72 z m 7.72,.99 -2.09,2.08 2.09,2.09 V 9.98 z" id="ytp-id-65"></path></svg>'
    : '<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%"><use class="ytp-svg-shadow" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ytp-id-15"></use><use class="ytp-svg-shadow" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ytp-id-16"></use><defs><clipPath id="ytp-svg-volume-animation-mask"><path d="m 14.35,-0.14 -5.86,5.86 20.73,20.78 5.86,-5.91 z"></path><path d="M 7.07,6.87 -1.11,15.33 19.61,36.11 27.80,27.60 z"></path><path class="ytp-svg-volume-animation-mover" d="M 9.09,5.20 6.47,7.88 26.82,28.77 29.66,25.99 z" transform="translate(0, 0)"></path></clipPath><clipPath id="ytp-svg-volume-animation-slash-mask"><path class="ytp-svg-volume-animation-mover" d="m -11.45,-15.55 -4.44,4.51 20.45,20.94 4.55,-4.66 z" transform="translate(0, 0)"></path></clipPath></defs><path class="ytp-svg-fill ytp-svg-volume-animation-speaker" clip-path="url(#ytp-svg-volume-animation-mask)" d="M8,21 L12,21 L17,26 L17,10 L12,15 L8,15 L8,21 Z M19,14 L19,22 C20.48,21.32 21.5,19.77 21.5,18 C21.5,16.26 20.48,14.74 19,14 ZM19,11.29 C21.89,12.15 24,14.83 24,18 C24,21.17 21.89,23.85 19,24.71 L19,26.77 C23.01,25.86 26,22.28 26,18 C26,13.72 23.01,10.14 19,9.23 L19,11.29 Z" fill="#fff" id="ytp-id-15"></path><path class="ytp-svg-fill ytp-svg-volume-animation-hider" clip-path="url(#ytp-svg-volume-animation-slash-mask)" d="M 9.25,9 7.98,10.27 24.71,27 l 1.27,-1.27 Z" fill="#fff" id="ytp-id-16" style="display: none;"></path></svg>'
}

chrome.runtime.onMessage.addListener((obj) => {
  if (obj.msg) {
    if (docQ('.ytp-fullscreen-button.ytp-button') && obj.msg === 'tabChangeUrl') lolalStorFunc('get', ['hostname'], init);
    if (obj.msg === 'stateChange') changeState(obj.state);
  }
});

chrome.storage.onChanged.addListener(() => lolalStorFunc('get', ['hostname']));
