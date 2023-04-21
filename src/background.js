import { Socket } from "./phoenix/index.js";
import * as Sentry from "@sentry/browser";

const UNAUTHENTICATED_ICONSET = {
  "16": "icons/droplet_unauthenticated_16.png",
  "24": "icons/droplet_unauthenticated_24.png",
  "32": "icons/droplet_unauthenticated_32.png",
  "64": "icons/droplet_unauthenticated_64.png",
  "128": "icons/droplet_unauthenticated_128.png",
  "256": "icons/droplet_unauthenticated_256.png",
  "512": "icons/droplet_unauthenticated_512.png"
};

const AUTHENTICATED_ICONSET = {
  "16": "icons/droplet_16.png",
  "24": "icons/droplet_24.png",
  "32": "icons/droplet_32.png",
  "64": "icons/droplet_64.png",
  "128": "icons/droplet_128.png",
  "256": "icons/droplet_256.png",
  "512": "icons/droplet_512.png"
};

Sentry.init({dsn: "<SENTRY_DSN"})


const WEBSOCKET_URL = "ws://localhost:4000/socket";

let jwt;
let socket = new Socket(WEBSOCKET_URL);
socket.connect();

chrome.runtime.onInstalled.addListener(() => {
  // Just reload all the tabs they have, because they are lazy AF ¯\_(ツ)_/¯
  chrome.tabs.query({url: ['*://eksisozluk.com/*', '*://eksisozluk2023.com/*']}, (tabs) => {
    tabs.forEach(tab => chrome.tabs.reload(tab.id))
  });
});

// Whenever the JWT changes we assign it to the variable instead of trying to fetch
// if from the storage every time we need it.
chrome.storage.onChanged.addListener((changes, namespace) => {
  try {
    if (changes.jwt) {
      jwt = changes.jwt.newValue;

      // Reload all eksisozluk tabs once we receive the JWT from the web app
      // if it's the first time we're getting it.
      // So we can properly set whether the user's voted for any of the messages on the screen.
      if (!changes.jwt.oldValue) {
	chrome.tabs.query({url: ['*://eksisozluk.com/*', '*://eksisozluk2023.com/*']}, (tabs) => {
	  tabs.forEach(tab => chrome.tabs.reload(tab.id))
	});
      }
    }
  } catch(e) {
    Sentry.captureException(e);
  }
});

/*
  * This is so that on startup we fetch the JWT and set it.
  * Otherwise JWT would be undefined, until we get & set a new one.
  * Regarding the icon change,  we're just assuming the JWT always comes from the app.
*/
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get('jwt', (result) => {
    try {
      if (result.jwt) {
	jwt = result.jwt;
	chrome.action.setIcon({path: AUTHENTICATED_ICONSET});
      }
    } catch(e) {
      Sentry.captureException(e);
    }
  });
});

// Once we receive the token from the web application we store it in the local storage
// and try to connect to the socket.
chrome.runtime.onMessageExternal.addListener(
  function(msg, sender, sendResponse) {
    try {
      if (msg.jwt) {
	chrome.storage.local.set({jwt: msg.jwt});
	chrome.action.setIcon({path: AUTHENTICATED_ICONSET})
      }
    } catch(e) {
      Sentry.captureException(e);
    }
  }
);

// Handle join and leave requests for channels
chrome.runtime.onMessage.addListener(
   function(msg, sender, sendResponse) {
     switch (msg.type) {
       case "join":
	 let channel = socket.channel(msg.topic, {jwt: jwt})

	 channel.join()
	   .receive("ok", resp => { dispatch_initial_votes_to_tabs(resp, channel); })
	   .receive("error", resp => { console.log("Unable to join", resp) })

	 channel.on("vote_count_changed", payload => dispatch_event_to_tabs(payload, channel));
	 break;

       case "leave":
	 find_channel(msg.topic)?.leave()
	   .receive("ok", resp => { console.log("Left successfully", resp) })
	   .receive("error", resp => { console.log("Unable to leave", resp) })
	 break;
     }

    //  If you want to asynchronously use sendResponse,
    //  add return true; to the onMessage event handler,
    // which is what we do above.
    return true;
  }
)

// Handle upvote and unvote requests from users.
chrome.runtime.onMessage.addListener(
  function (msg, sender, sendResponse) {
    switch (msg.type) {
      case "upvote":
	upvote(msg.entryId, msg.topic, sendResponse);
	break;
      case "unvote":
	unvote(msg.entryId, msg.topic, sendResponse);
	break;
    }
  }
);

function find_channel(topic) {
  return socket.channels.find(channel => channel.topic == topic);
}

function upvote(entry_id, topic, sendResponse) {
  // No need to make a request if we don't have a JWT.
  if (!jwt) {
    sendResponse("unauthorized");
    return;
  }

  let channel = find_channel(topic);

  channel?.push("upvote", {entry_id: entry_id, jwt: jwt})
    .receive("ok", () => { dispatch_successful_upvote_to_tabs(channel, entry_id) })
    .receive("unauthorized", () => { sendResponse("unauthorized") })
}

function unvote(entry_id, topic, sendResponse) {
  // No need to make a request if we don't have a JWT.
  if (!jwt) {
    sendResponse("unauthorized");
    return;
  }

  let channel = find_channel(topic);

  channel?.push("unvote", {entry_id: entry_id, jwt: jwt})
    .receive("ok", () => { dispatch_successful_unvote_to_tabs(channel, entry_id) })
    .receive("unauthorized", () => { sendResponse("unauthorized") })
}

// Once we get an event from the web app, we need to push those events
// to the tabs that are related.
function dispatch_event_to_tabs(payload, channel) {
  let topic_id = get_topic_id(channel);

  chrome.tabs.query({url: [`*://eksisozluk2023.com/*${topic_id}*`]}, (tabs) => {
    tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {...payload, ...{type: 'vote_count_changed'}}));
  });
}

function dispatch_initial_votes_to_tabs(payload, channel) {
  let topic_id = get_topic_id(channel);

  chrome.tabs.query({url: [`*://eksisozluk2023.com/*${topic_id}*`]}, (tabs) => {
    tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {type: 'set_initial_vote_counts', vote_counts: payload}));
  });
}

function dispatch_successful_upvote_to_tabs(channel, entry_id) {
  let topic_id = get_topic_id(channel);

  chrome.tabs.query({url: [`*://eksisozluk2023.com/*${topic_id}*`]}, (tabs) => {
    tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {type: 'upvote_successful', entry_id: entry_id}));
  });
}

function dispatch_successful_unvote_to_tabs(channel, entry_id) {
  let topic_id = get_topic_id(channel);

  chrome.tabs.query({url: [`*://eksisozluk2023.com/*${topic_id}*`]}, (tabs) => {
    tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {type: 'unvote_successful', entry_id: entry_id}));
  });
}

function get_topic_id(channel) {
  return channel.topic.split(":")[1];
}

/******************** POPUP ONCLICK LISTENER ********************/

chrome.action.onClicked.addListener(() => {
  chrome.storage.local.get("token", ({token}) => {
    if (token)
      chrome.tabs.create({url: "https://dert.gg"})
    else
      chrome.tabs.create({url: "https://dert.gg/login/new"})
  })
})
