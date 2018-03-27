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
    this.url = url;
    this.cmd = cmd;
  }

  static sendRequest(action) {
  }

  play() {

  }
  stop() {
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
        let elJSON = queryToJson(decodeURIComponent(el));
        elJSON.url = elJSON.url.replace(/^https/, "http");

        if (elJSON.sig) elJSON.url += '&signature=' + elJSON.sig;
        if (elJSON.url && elJSON.itag && elJSON.type.includes("video/mp4;")) urlData.push(elJSON);
      });
      urlData.sort(sortUrl);

      console.log("Video format ", urlData[0], ", itag = ", urlData[0].itag);
      return urlData[0];
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
    if(videoUrl) videoAction(cmd)
  }
}

function videoAction(cmd) {
  console.log(cmd)
}

chrome.extension.onMessage.addListener(request => {
  let { href, msg, cmd } = request;
  if (msg === 'action') {
    console.log('Received: ', request);

    cmd.action === 'play' ? getVideoUrl(href, cmd) : videoAction(cmd)
  }
});
