chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'replais_suggest',
      title: 'Reply with ReplAIs',
      contexts: ['selection', 'editable']
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log('context menu clicked', info, tab);
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'SUGGEST_REPLY' });
    }
  });
  
  chrome.commands.onCommand.addListener((cmd) => {
    if (cmd === 'suggest_reply') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'SUGGEST_REPLY' });
        }
      });
    }
  });