import { Socket } from './phoenix/index.js';
import * as Sentry from '@sentry/browser';

const UNAUTHENTICATED_ICONSET = {
  16: 'icons/droplet_unauthenticated_16.png',
  24: 'icons/droplet_unauthenticated_24.png',
  32: 'icons/droplet_unauthenticated_32.png',
  64: 'icons/droplet_unauthenticated_64.png',
  128: 'icons/droplet_unauthenticated_128.png',
  256: 'icons/droplet_unauthenticated_256.png',
  512: 'icons/droplet_unauthenticated_512.png',
};

const AUTHENTICATED_ICONSET = {
  16: 'icons/droplet_16.png',
  24: 'icons/droplet_24.png',
  32: 'icons/droplet_32.png',
  64: 'icons/droplet_64.png',
  128: 'icons/droplet_128.png',
  256: 'icons/droplet_256.png',
  512: 'icons/droplet_512.png',
};

Sentry.init({
  dsn: 'https://6b9c49499321423e945d8e9dec3191aa@o4505070407254016.ingest.sentry.io/4505071082733568',
});

const WEBSOCKET_URL = 'wss://dert.gg/socket';

let socket;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('jwt', ({jwt}) => {
    try {
      if (jwt) {
        chrome.action.setIcon({ path: AUTHENTICATED_ICONSET });
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  });

  // Just reload all the tabs they have, because they are lazy AF ¯\_(ツ)_/¯
  reload_eksisozluk_tabs();

  chrome.tabs.create({ url: 'https://dert.gg' });
});

/*
 * Reload all eksisozluk tabs once we receive the JWT from the web app
 * if it's the first time we're getting it.
 * So we can properly set whether the user's voted for any of the messages on the screen.
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  try {
    if (!changes.jwt?.oldValue) {
      console.debug("Setting the JWT for the first time.");

      reload_eksisozluk_tabs();
    }
  } catch (e) {
    Sentry.captureException(e);
  }
});

// We assume on startup that if they've got a JWT in local storage, they're logged in.
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get('jwt', (result) => {
    try {
      if (result.jwt) {
        chrome.action.setIcon({ path: AUTHENTICATED_ICONSET });
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  });
});

// Once we receive the token from the web application we store it in the local storage
// and try to connect to the socket.
chrome.runtime.onMessageExternal.addListener(function (
  msg,
  sender,
  sendResponse
) {
  try {
    if (msg.jwt) {
      chrome.storage.local.set({ jwt: msg.jwt });
      chrome.action.setIcon({ path: AUTHENTICATED_ICONSET });
    }
  } catch (e) {
    Sentry.captureException(e);
  }
});

// Handle join and leave requests for channels
chrome.runtime.onMessage.addListener(async function (msg, sender, sendResponse) {
  switch (msg.type) {
    case 'join':
      // Make sure there's socket connection first.
      if (!socket || !socket.isConnected()) {
        console.debug("Connecting to the socket for the first time.");

        socket = new Socket(WEBSOCKET_URL);
        socket.connect();
      };

      let storage = await chrome.storage.local.get('jwt');
      let channel = socket.channel(msg.topic, { jwt: storage.jwt });

      channel
        .join()
        .receive('ok', (resp) => {
          console.log(`Joined channel ${msg.topic}.`, resp);
          dispatch_initial_votes_to_tabs(resp, channel);
        })
        .receive('error', (resp) => {
          console.log(`Unable to join channel ${msg.topic}.`, resp);
        });

      channel.on('vote_count_changed', (payload) =>
        dispatch_event_to_tabs(payload, channel)
      );
      break;

    case 'leave':
      socket?.leaveOpenTopic(msg.topic);
      break;
  }

  //  If you want to asynchronously use sendResponse,
  //  add return true; to the onMessage event handler,
  // which is what we do above.
  return true;
});

// Handle upvote and unvote requests from users.
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  switch (msg.type) {
    case 'upvote':
      upvote(msg.entryId, msg.topic, sendResponse);
      break;
    case 'unvote':
      unvote(msg.entryId, msg.topic, sendResponse);
      break;
  }

  // Return true since we use SendResponse asynchronously.
  return true;
});

function find_channel(topic) {
  // We need to check whether there's already a socket.
  if (socket) {
    return socket.channels.find((channel) => channel.topic == topic);
  }
}

async function upvote(entry_id, topic, sendResponse) {
  console.debug(`Trying to upvote entry #${entry_id} in ${topic}.`)

  let storage =  await chrome.storage.local.get('jwt');

  if (!storage.jwt) {
    console.debug("JWT doesn't exist in local storage.")

    sendResponse('unauthorized');
    handle_unauthorized();
    return;
  }

  let channel = find_channel(topic);

  channel
    ?.push('upvote', { entry_id: entry_id, jwt: storage.jwt })
    .receive('ok', () => {
      console.debug(`Successfully upvoted entry #${entry_id} in ${topic}.`)
      dispatch_successful_upvote_to_tabs(channel, entry_id);
    })
    .receive('unauthorized', () => {
      console.debug("Unauthorized to upvote.");
      sendResponse('unauthorized');
      handle_unauthorized();
    })
    .receive('timeout', () => {
      console.debug("Unvote request timed out.");
      sendResponse('timeout');
    });
}

async function unvote(entry_id, topic, sendResponse) {
  console.debug(`Trying to unvote entry #${entry_id} in ${topic}.`)

  let storage =  await chrome.storage.local.get('jwt');

  if (!storage.jwt) {
    console.debug("JWT doesn't exist in local storage.")

    sendResponse('unauthorized');
    handle_unauthorized();
    return;
  }

  let channel = find_channel(topic);

  channel
    ?.push('unvote', { entry_id: entry_id, jwt: storage.jwt })
    .receive('ok', () => {
      console.debug(`Successfully unvoted entry #${entry_id} in ${topic}.`)
      dispatch_successful_unvote_to_tabs(channel, entry_id);
    })
    .receive('unauthorized', () => {
      console.debug("Unauthorized to unvote.");
      sendResponse('unauthorized');
      handle_unauthorized();
    })
    .receive('timeout', () => {
      console.debug("Unvote request timed out.");
      sendResponse('timeout');
    });
}

function reload_eksisozluk_tabs() {
  chrome.tabs.query(
    { url: ['*://eksisozluk.com/*', '*://eksisozluk1923.com/*'] },
    (tabs) => {
      tabs.forEach((tab) => chrome.tabs.reload(tab.id));
    }
  );
}

// Once we get an event from the web app, we need to push those events
// to the tabs that are related.
function dispatch_event_to_tabs(payload, channel) {
  let topic_id = get_topic_id(channel);

  chrome.tabs.query(
    { url: [`*://eksisozluk1923.com/*${topic_id}*`] },
    (tabs) => {
      tabs.forEach((tab) =>
        chrome.tabs.sendMessage(tab.id, {
          ...payload,
          ...{ type: 'vote_count_changed' },
        })
      );
    }
  );
}

function dispatch_initial_votes_to_tabs(payload, channel) {
  let topic_id = get_topic_id(channel);

  chrome.tabs.query(
    { url: [`*://eksisozluk1923.com/*${topic_id}*`] },
    (tabs) => {
      tabs.forEach((tab) =>
        chrome.tabs.sendMessage(tab.id, {
          type: 'set_initial_vote_counts',
          vote_counts: payload,
        })
      );
    }
  );
}

function dispatch_successful_upvote_to_tabs(channel, entry_id) {
  let topic_id = get_topic_id(channel);

  chrome.tabs.query(
    { url: [`*://eksisozluk1923.com/*${topic_id}*`] },
    (tabs) => {
      tabs.forEach((tab) =>
        chrome.tabs.sendMessage(tab.id, {
          type: 'upvote_successful',
          entry_id: entry_id,
        })
      );
    }
  );
}

function dispatch_successful_unvote_to_tabs(channel, entry_id) {
  let topic_id = get_topic_id(channel);

  chrome.tabs.query(
    { url: [`*://eksisozluk1923.com/*${topic_id}*`] },
    (tabs) => {
      tabs.forEach((tab) =>
        chrome.tabs.sendMessage(tab.id, {
          type: 'unvote_successful',
          entry_id: entry_id,
        })
      );
    }
  );
}

function get_topic_id(channel) {
  return channel.topic.split(':')[1];
}

// When we know that the user actually is unauthorized
function handle_unauthorized() {
  chrome.storage.local.remove('jwt');
  chrome.action.setIcon({ path: UNAUTHENTICATED_ICONSET });
}

/******************** POPUP ONCLICK LISTENER ********************/

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'https://dert.gg' });
});
