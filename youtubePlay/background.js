chrome.extension.onMessage.addListener(request => {
  if (request.msg === 'action') {
    console.log('Received: ', request);
  }
});
