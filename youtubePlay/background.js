'use strict'

const lolalStorFunc = function (param, keyValue, callback) {
    chrome.storage.local[param](keyValue, function (result) {
      param === 'set' ? console.log('Settings saved') : constLocalObj(result);
      if (callback) callback();
    });
  },
  localObj = {
    hostname: 'apple-tv.local'
  },
  constLocalObj = (result) => {
    for (let i in result) localObj[i] = result[i];
  };

let isPlaying = false;

class Video {
  constructor() {
    this.url = () => `http://${localObj.hostname}${localObj.hostname.includes(':') ? '' : ':7000'}`;
    this.timer = false;
    this.sendToScriptCount = 0;
    this.keysLength = 0;
    this.pbStart = false;
    this.needStop = false;
  }

  sendRequest({method = 'POST', url, headers = {}, data = null, callback, f}) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true, 'AirPlay', null);
    if (callback) xhr.onload = () => callback(xhr.responseXML);
    xhr.onerror = () => _this.onError(xhr.error, f);
    for (let i in headers) xhr.setRequestHeader(i, headers[i]);
    xhr.send(data);
  }

  sendToScript(data) {
    let _this = this;
    chrome.tabs.query({active: true}, tabs => {
      if (tabs[0] && tabs[0].id) {
        _this.sendToScriptCount = 0;
        chrome.tabs.sendMessage(tabs[0].id, data);
      } else if (_this.sendToScriptCount < 3) {
        _this.sendToScriptCount++;
        _this.sendToScript(data);
      } else {
        _this.sendToScriptCount = 0;
      }
    });
  }

  playback() {
    const _this = this;
    clearInterval(this.timer);
    const callback = resXML => {
      _this.keysLength = resXML.getElementsByTagName("key").length;
      console.log('_this.pbStart: ', _this.pbStart, ', _this.keysLength: ', _this.keysLength, ', _this.needStop', _this.needStop);
      if (!_this.pbStart && _this.keysLength > 2) { // video is playing
        _this.sendToScript({msg: 'stateChange', state: 'play'});
        isPlaying = true;
        _this.pbStart = true;
        _this.needStop = false;
      }
      if (_this.needStop || _this.keysLength < 2) { // tv is ready too long or not ready
        clearInterval(_this.timer);
        console.log('if (_this.needStop || _this.keysLength < 2) {');
        _this.stop();
        _this.pbStart = false;
      }
      if (_this.pbStart && _this.keysLength === 2) { // playback stopped, tv is ready
        clearInterval(_this.timer);
        console.log('if (_this.pbStart && _this.keysLength === 2) {');
        _this.stop();
        _this.pbStart = false;
        _this.needStop = true;
      }
    };

    this.timer = setInterval(function () {
      _this.sendRequest({
        callback,
        method: 'GET',
        url: `${_this.url()}/playback-info`
      });
    }, 5000);
  }

  play({videoUrl, position}) {
    const _this = this;
    console.log('play', videoUrl, position);
    this.keysLength = 0;
    this.pbStart = false;
    this.needStop = false;
    const callback = () => _this.playback();
    _this.sendRequest({
      callback,
      url: `${_this.url()}/play`,
      headers: {
        'Content-Type': 'text/parameters'
      },
      data: `Content-Location: ${videoUrl}\nStart-Position: ${position ? position : '0'}\n`
    });
  }

  pause() {
    this.rate(0);
  }

  rate(value) {
    this.sendRequest({
      url: `${this.url()}/rate?value=${value}`
    });
  }

  scrub(sec) {
    const callback = () => this.rate(1);
    this.sendRequest({
      callback,
      url: `${this.url()}/scrub?position=${sec}`
    });
  }

  stop() {
    clearInterval(this.timer);
    isPlaying = false;
    const callback = this.sendToScript({msg: 'stateChange', state: 'stop'});
    this.sendRequest({
      f: 'stop',
      url: `${this.url()}/stop`,
      callback
    })
  }

  volume(value) {
    this.sendRequest({
      url: `${this.url()}/volume?value=${value}`
    });
  }

  onError(error, f) {
    console.error('New Error: ', error);
    if (f !== 'stop') this.stop();
  }
}

let video;

lolalStorFunc('get', ['hostname']);
chrome.storage.onChanged.addListener(() => lolalStorFunc('get', ['hostname']));

function queryToJson(qs) {
  let params = {};
  qs = qs.replace(/\+/g, " ").split("&");
  qs.forEach(el => params[el.split('=')[0]] = el.split('=')[1]);
  return params;
}

function getVideoUrl(id, cmd) {
  let videoUrl;

  const XK = {
    wW: (a, b) => {
      const c = a[0];
      a[0] = a[b % a.length];
      a[b % a.length] = c
    },
    qs: a => a.reverse(),
    QC: (a, b) => a.splice(0, b)
  };

  function YK(a) {
    a = a.split("");
    XK.qs(a, 44);
    XK.QC(a, 3);
    XK.qs(a, 79);
    XK.QC(a, 3);
    XK.wW(a, 38);
    XK.QC(a, 1);
    XK.wW(a, 64);
    XK.qs(a, 18);
    XK.QC(a, 2);
    return a.join("")
  }

  function getYoutubeUrl(uefsm) {
    if (uefsm && uefsm.length > 1) {
      let urlData = [];
      let videoArray = decodeURIComponent(uefsm).split(',');
      let sortUrl = (a, b) => a.itag === '22' ? 0 : b.itag - a.itag;

      videoArray.forEach(el => {
        let elJSON = queryToJson(el);
        if (elJSON.sig) elJSON.url += '&signature=' + elJSON.sig;
        else if (elJSON.s) elJSON.url += "&signature=" + YK(elJSON.s);
        if (elJSON.url && elJSON.itag && decodeURIComponent(elJSON.type).includes("video/mp4;")) urlData.push(elJSON);
      });
      urlData.sort(sortUrl);

      console.log("Video format ", decodeURIComponent(urlData[0].type), ", itag = ", urlData[0].itag);
      let yt = decodeURIComponent(urlData[0].url);
      /requiressl=yes/.test(yt) ? yt = yt.replace(/^http:/, "https:") : yt = yt.replace(/^https:/, "http:");
      return yt;
    }
    else console.log("Can't find video url");
  }

  const request = new XMLHttpRequest();
  const requestUrl = "https://www.youtube.com/get_video_info?&video_id=" + id + "&eurl=http%3A%2F%2Fwww%2Eyoutube%2Ecom%2F&sts=1588";
  request.open('GET', requestUrl, false);
  request.send();

  if (request.status === 200) {
    const q = queryToJson(request.responseText);

    if (q.token && q.url_encoded_fmt_stream_map)
      videoUrl = getYoutubeUrl(q.url_encoded_fmt_stream_map);
    else console.log('no token');
    if (videoUrl) videoAction(cmd, videoUrl)
  }
}

function videoAction(cmd, videoUrl = null) {
  // console.log(cmd, videoUrl);
  video = video ? video : new Video();
  switch (cmd.action) {
    case 'start':
      video.play({videoUrl, position: cmd.num});
      break;
    case 'stop':
      video.stop();
      break;
    case 'scrub':
      if (isPlaying) video.scrub(cmd.num);
      break;
    case 'pause':
      if (isPlaying) video.pause();
      break;
    case 'volume':
      // video.volume();
      break;
    default:
      break;
  }
}

chrome.extension.onMessage.addListener(request => {
  let {href, msg, cmd} = request;
  if (msg === 'action') {
    const ytID = href.split('v=')[1].split('&')[0];

    cmd.action === 'start' ? getVideoUrl(ytID, cmd) : videoAction(cmd);
  }
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('tabId', tabId);

  if (changeInfo && changeInfo.status == "complete" &&
    tab.url && tab.url.includes('://www.youtube.com/watch?')) chrome.tabs.sendMessage(tabId, {msg: 'tabChangeUrl'}, () => {
  });
});
