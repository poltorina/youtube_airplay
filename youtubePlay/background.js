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
  constructor(url, cmd) {
    const {hostname} = localObj;
    this.url = `http://${hostname}${hostname.includes(':') ? '' : ':7000'}`;
    this.cmd = cmd;
  }

  static sendRequest({method = 'POST', url, headers = {}, data = null, callback}) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true, 'AirPlay', null);

    xhr.onload = callback;

    for(let i in headers) xhr.setRequestHeader(i, headers[i]);

    xhr.send(data);
  }

  play(videoUrl, position) {
    this.stop();
    this.sendRequest({
      url: `${this.url}/`,
      headers: {
        'Content-Type': 'text/parameters'
      },
      data: `Content-Location: ${videoUrl}\nStart-Position: ${position}\n`
    });

  }
  stop() {
    const callback = () => console.log('stop callback', this.response);
    this.sendRequest({
      callback,
      url: `${this.url}/stop`
    })
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

function getVideoUrl(url, cmd) {
  let videoUrl;
  function getYoutubeUrl(uefsm) {
    if (uefsm && uefsm.length > 1) {
      let urlData = [];
      let videoArray = decodeURIComponent(uefsm).split(',');
      let sortUrl = (a, b) => a.itag === '22' ? 0 :  b.itag - a.itag;

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
  const requestUrl = "https://www.youtube.com/get_video_info?&video_id=" + url.split('v=')[1].split('&')[0] + "&eurl=http%3A%2F%2Fwww%2Eyoutube%2Ecom%2F&sts=1588";
  request.open('GET', requestUrl, false);
  request.send();

  if (request.status === 200) {
    const q = queryToJson(request.responseText);

    if (q.token && q.url_encoded_fmt_stream_map)
      videoUrl = getYoutubeUrl(q.url_encoded_fmt_stream_map);
    else console.log('no token');
    if(videoUrl) videoAction(cmd, videoUrl)
  }
}

function videoAction(cmd, videoUrl = null) {
  console.log(cmd, videoUrl);

}

chrome.extension.onMessage.addListener(request => {
  let { href, msg, cmd } = request;
  if (msg === 'action') {
    console.log('Received: ', request);

    cmd.action === 'play' ? getVideoUrl(href, cmd) : videoAction(cmd)
  }
});
