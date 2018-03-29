'use strict'

const lolalStorFunc = function (param, keyValue, callback) {
    chrome.storage.local[param](keyValue, function (result) {
      param === 'set' ? console.log('Settings saved') : constLocalObj(result);
      if (callback) callback();
    });
  },
  localObj = {},
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
    if(url.includes('playback-info')) {
      const _this = this;
      this.canGet = false;
      setTimeout(function () {_this.canGet = true}, 5000);
    }
    if(!url.includes('playback-info') || this.canGet) {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true, 'AirPlay', null);
      xhr.onload = () => callback(xhr.responseXML);
      xhr.onerror = () => this.onError(xhr.error, f);
      for (let i in headers) xhr.setRequestHeader(i, headers[i]);
      xhr.send(data);
    }
  }

  playback(url) {
    const _this = this;
    clearInterval(this.timer);
    let keysLength = 0, // 0 not playing; 2 ready to play; >2 playing
      pbStart, needStop;
    const callback = (resXML) => {
      keysLength = resXML.getElementsByTagName("key").length;
      console.log('pbStart: ', pbStart, ', keysLength: ', keysLength, ', needStop', needStop);
      if (!pbStart && keysLength > 2) { // video is playing
        console.log('!pbStart && keysLength > 2');
        pbStart = true;
        needStop = false;
      }
      if (needStop || keysLength < 2) { // tv is ready too long or not ready
        console.log('needStop && keysLength <= 2');
        console.log(this.timer);
        clearInterval(_this.timer);
        _this.stop();
        pbStart = false;
      }
      if (pbStart && keysLength === 2) { // playback stopped, tv is ready
        console.log('pbStart && keysLength === 2');
        console.log(this.timer);
        clearInterval(_this.timer);
        _this.stop();
        pbStart = false;
        needStop = true;
      }

    };

    this.timer = setInterval(function () {
      console.log('playback from: ', url);
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
    const callback = (e) => {
      console.log('play callback', e);
      _this.playback(videoUrl);
    };
    Video.sendRequest({
      callback,
      url: `${_this.url}/play`,
      headers: {
        'Content-Type': 'text/parameters'
      },
      data: `Content-Location: ${videoUrl}\nStart-Position: ${position}\n`
    });
  }

  pause() {
    this.rate(0);
  }

  rate(value) {
    const _this = this;
    console.log('rate');
    const callback = (e) => console.log('rate callback', e);
    Video.sendRequest({
      callback,
      url: `${_this.url}/rate?value=${value}`
    });
  }

  scrub(sec) {
    console.log('scrub');
    const callback = () => this.rate(1);
    Video.sendRequest({
      callback,
      url: `${this.url}/scrub?position=${sec}`
    });
  }

  stop() {
    console.log(this.timer);
    clearInterval(this.timer);
    console.log('stop');
    const callback = (e) => console.log('stop callback', e);
    Video.sendRequest({
      f: 'stop',
      callback,
      url: `${this.url}/stop`
    })
  }

  volume(value) {
    const callback = (e) => console.log('volume callback', e);
    Video.sendRequest({
      callback,
      url: `${this.url}/volume?value=${value}`
    });
  }

  onError(error, f) {
    console.log('New Error: ', error);
    if(f !== 'stop') this.stop();
  }
}

lolalStorFunc('get', ['hostname', 'playPosition']);
chrome.storage.onChanged.addListener(() => lolalStorFunc('get', ['hostname', 'playPosition']));

function queryToJson(qs) {
  let params = {};
  qs = qs.replace(/\+/g, " ").split("&");
  qs.forEach(el => params[el.split('=')[0]] = el.split('=')[1]);
  return params;
}

function getVideoUrl(id, cmd, ytObj) {
  let videoUrl;

  function getYoutubeUrl(uefsm) {
    if (uefsm && uefsm.length > 1) {
      let urlData = [];
      let videoArray = decodeURIComponent(uefsm).split(',');
      let sortUrl = (a, b) => a.itag === '22' ? 0 : b.itag - a.itag;

      videoArray.forEach(el => {
        let elJSON = queryToJson(el);
        if (elJSON.sig) elJSON.url += '&signature=' + elJSON.sig;
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
  const video = new Video();
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

    console.log('localObj.yuID', localObj.yuID);

    console.log('Received: ', request);

    cmd.action === 'start' ? getVideoUrl(ytID, cmd) : videoAction(cmd);
  }
});
