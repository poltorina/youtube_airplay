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

class Video {
  constructor() {
    const {hostname} = localObj;
    this.hostname = hostname;
    this.url = `http://${hostname}${hostname.includes(':') ? '' : ':7000'}`;
    this.timer = false;
    this.canGet = true;
  }

  static sendRequest({method = 'POST', url, headers = {}, data = null, callback, f}) {
    if (url.includes('playback-info')) {
      const _this = this;
      this.canGet = false;
      setTimeout(function () {
        _this.canGet = true
      }, 5000);
    }
    if (!url.includes('playback-info') || this.canGet) {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true, 'AirPlay', null);
      if (callback) xhr.onload = () => callback(xhr.responseXML);
      xhr.onerror = () => this.onError(xhr.error, f);
      for (let i in headers) xhr.setRequestHeader(i, headers[i]);
      xhr.send(data);
    }
  }

  playback(url) {
    const _this = this;
    clearInterval(this.timer);
    let keysLength = 0,
      pbStart, needStop;
    const callback = (resXML) => {
      keysLength = resXML.getElementsByTagName("key").length;
      console.log('pbStart: ', pbStart, ', keysLength: ', keysLength, ', needStop', needStop);
      if (!pbStart && keysLength > 2) { // video is playing
        pbStart = true;
        needStop = false;
      }
      if (needStop || keysLength < 2) { // tv is ready too long or not ready
        clearInterval(_this.timer);
        _this.stop();
        pbStart = false;
      }
      if (pbStart && keysLength === 2) { // playback stopped, tv is ready
        clearInterval(_this.timer);
        _this.stop();
        pbStart = false;
        needStop = true;
      }

    };

    this.timer = setInterval(function () {
      console.log('playback from: ', url, new Date());
      Video.sendRequest({
        callback,
        method: 'GET',
        url: `${_this.url}/playback-info`
      });
    }, 5000);
  }

  play({videoUrl, position}) {
    const _this = this;
    console.log('play', videoUrl, position);
    console.log(videoUrl, position);
    const callback = () => _this.playback(videoUrl);
    Video.sendRequest({
      callback,
      url: `${_this.url}/play`,
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
    Video.sendRequest({
      url: `${this.url}/rate?value=${value}`
    });
  }

  scrub(sec) {
    const callback = () => this.rate(1);
    Video.sendRequest({
      callback,
      url: `${this.url}/scrub?position=${sec}`
    });
  }

  stop() {
    clearInterval(this.timer);
    Video.sendRequest({
      f: 'stop',
      url: `${this.url}/stop`
    })
  }

  volume(value) {
    Video.sendRequest({
      url: `${this.url}/volume?value=${value}`
    });
  }

  onError(error, f) {
    console.log('New Error: ', error);
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
  console.log(cmd, videoUrl);
  video = video ? video : new Video();
  switch (cmd.action) {
    case 'start':
      video.play({videoUrl, position: cmd.num});
      break;
    case 'scrub':
      video.scrub(cmd.num);
      break;
    case 'pause':
      video.pause();
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

    console.log('Received: ', request);

    cmd.action === 'start' ? getVideoUrl(ytID, cmd) : videoAction(cmd);
  }
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo && changeInfo.status == "complete" &&
    tab.url && tab.url.includes('://www.youtube.com/watch?')) chrome.tabs.sendMessage(tabId, {data: tab}, () => {
  });
});
