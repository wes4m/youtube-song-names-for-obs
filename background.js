// All of the tracked tabs.
let tabs = new Map();

// Gets the url to a blob containing the given string.
function stringToUrl(s) {
  return URL.createObjectURL(new Blob([s], {type: "text/plain"}));
}

function send_tab_data(tab) {
	if (!tab.audible) {
		// Paused
		console.log('Audible tab paused/closed = nothing is playing');
	}
	else {
	    console.log('Audible tab played:\n\ttitle: ' +  tab.name + "\n\tURL: " + tab.url);
	}

   var http = new XMLHttpRequest();
   http.open("POST", "http://localhost:6767/update_widget");
   http.responseType = 'text';
   http.setRequestHeader("Content-type", "application/json");
   http.send(JSON.stringify({ "title": tab.name, "audible": tab.audible, "url": tab.url }));
   console.log('Tab data sent');
}

// Get the first tracked tab that has a known name and is audible, and download its name.
function update() {
  for (let tab of tabs.values()) {
    if (tab.name !== '' && tab.audible) {
      send_tab_data(tab);
      return;
    }
  }

  // paused tab (not audible)
  send_tab_data({name: '', audible: false, url: ''});
}

// Map from urls to the file that handles them.
function getScript(url) {
  if (url.startsWith('https://www.youtube.com/watch')) {
    return 'youtube.js';
  }
}

// Convenience wrapper.
function isUrlSupported(url) {
  return !!getScript(url);
}

// Add a tracked tab.
function add(id, url, audible) {
  let script = getScript(url);

  if (script && !tabs.has(id)) {
    tabs.set(id, {name: '', audible: audible || false, url: url});
    chrome.tabs.executeScript(id, {file: script, runAt: "document_end"});

    update();
  }
}

// Remove a tracked tab.
function remove(id) {
  let tab = tabs.get(id);

  if (tab) {
    tabs.delete(id);

    update();
  }
}

// Set the url of a tracked tab.
function setUrl(id, url) {
  let tab = tabs.get(id);

  if (tab) {
    tab.url = url;

    update();
  }
}

// Set the name of a tracked tab.
function setName(id, name) {
  let tab = tabs.get(id);

  if (tab) {
    tab.name = name;

    update();
  }
}

// Set the audible state of a tracked tab.
function setAudible(id, audible) {
  let tab = tabs.get(id);

  if (tab) {
    tab.audible = audible;

    update();
  }
}

// Listen to name changes from the scripts running on the sites.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  setName(sender.tab.id, request.name);
});

// Listen to tab updates.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url !== undefined) {
    // If a tracked tab changed the url to something that is not tracked, stop tracking it.
    if (tabs.has(tabId)) {
		// Update tab url
		setUrl(tabId, tab.url);
		if (!isUrlSupported(changeInfo.url)) {
        	remove(tabId);
        }
    } else {
      add(tabId, tab.url);
    }
  } else if (changeInfo.audible !== undefined) {
    setAudible(tabId, changeInfo.audible);
  } else if (changeInfo.status === 'loading') {
    remove(tabId);
  }
});

// Listen to tabs being removed.
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  remove(tabId);
});

// Listen to history state changes.
// This is needed for sites that don't reload the tab when the user clicks on a video.
// Content scripts defined in the manifest are only loaded on tab loads, and thus do not work in this case.
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  add(details.tabId, details.url);
});

// Go over all of the open tabs and add whatever's relevant.
function initialize() {
  chrome.tabs.query({}, (tabs) => {
    for (let tab of tabs) {
      add(tab.id, tab.url, tab.audible);
    }
  });
}

// Start.
initialize();
