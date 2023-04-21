import * as Sentry from "@sentry/browser";

Sentry.init({dsn: "<SENTRY_DSN>"})

// Get the subtopic from the URL and construct the topic(topic:subtopic)
// Topic is constant and defined in the backend
function constructTopic() {
  let url = document.URL
  let subtopic = url.match(/--(\d+)/)

  return subtopic ? "room:" + subtopic[1] : "room:lobby"
}

// Join the channel when the user enters the page
chrome.runtime.sendMessage({type: "join", topic: constructTopic()})

// Send a message to the background script when the user leaves the page
// to leave the channel
window.addEventListener("beforeunload", (event) => {
  chrome.runtime.sendMessage({type: "leave", topic: constructTopic()})
})

chrome.runtime.onMessage.addListener(
  function (msg, sender, sendResponse) {
    try {
      if (msg.type == "vote_count_changed") {
	console.log("Got the vote count changed message from backgroun")
	let count = document.querySelector(`li[data-id="${msg.entry_id}"] .dert-gg-count`);

	if (count) {
	  count.innerHTML = `(${msg.vote_count})`;
	}
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  }
)

chrome.runtime.onMessage.addListener(
  function (msg, sender, sendResponse) {
    try {
      if (msg.type == "set_initial_vote_counts") {
	let entry_items = document.querySelectorAll('#entry-item');

	entry_items.forEach(entry_item => {
	  let entry_id = entry_item.getAttribute('data-id');
	  let vote_count = find_vote_count_for_entry_id(entry_id, msg.vote_counts);

	  if (vote_count) {
	    let dert_gg_count = entry_item.querySelector('.dert-gg-count');
	    let dert_gg_button = entry_item.querySelector('.dert-gg-button');

	    dert_gg_count.innerHTML = `(${vote_count[entry_id]})`;

	    if (vote_count['has_voted']) {
	      dert_gg_count.style.color = "#53a245";
	      dert_gg_button.style.color = "#53a245";
	      dert_gg_button.setAttribute('data-action', 'unvote');
	    }
	  }
	});
      }
    } catch(e) {
      Sentry.captureException(e);
    }
  }
)

chrome.runtime.onMessage.addListener(
  function (msg, sender, sendResponse) {
    try {
      if (msg.type == 'upvote_successful') {
	let dert_gg_button = document.querySelector(`li[data-id="${msg.entry_id}"] .dert-gg-button`);
	let dert_gg_count = document.querySelector(`li[data-id="${msg.entry_id}"] .dert-gg-count`);

	dert_gg_button.setAttribute('data-action', 'unvote');

	dert_gg_button.style.color = "#53a245";
	dert_gg_count.style.color = "#53a245";
      }
    } catch(e) {
      Sentry.captureException(e);
    }
  }
)

chrome.runtime.onMessage.addListener(
  function (msg, sender, sendResponse) {
    try {
      if (msg.type == 'unvote_successful') {
	let dert_gg_button = document.querySelector(`li[data-id="${msg.entry_id}"] .dert-gg-button`);
	let dert_gg_count = document.querySelector(`li[data-id="${msg.entry_id}"] .dert-gg-count`);

	dert_gg_button.setAttribute('data-action', 'upvote');

	dert_gg_button.style.color = "#bdbdbd";
	dert_gg_count.style.color = "#bdbdbd";
      }
    } catch(e) {
      Sentry.captureException(e);
    }
  }
)

function find_vote_count_for_entry_id(entry_id, vote_counts) {
  return vote_counts.find(vote_count => entry_id in vote_count);
};
