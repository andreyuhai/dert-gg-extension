import * as Sentry from "@sentry/browser";

Sentry.init({dsn: "https://6b9c49499321423e945d8e9dec3191aa@o4505070407254016.ingest.sentry.io/4505071082733568"})

// Get the subtopic from the URL and construct the topic(topic:subtopic)
// Topic is constant and defined in the backend
function construct_topic() {
  let url = document.URL
  let subtopic = url.match(/--(\d+)/)

  return subtopic ? "room:" + subtopic[1] : "room:lobby"
}

function click_handler() {
  let action = this.getAttribute('data-action')
  let entry_item = this.closest('li');
  let entry_id = entry_item.getAttribute('data-id');
  let dert_gg_count = this.nextElementSibling;
  let err_msg;

  if (!['upvote', 'unvote'].includes(action)) {
    notify('Hiçbir şey olmamış ise kesinlikle bir şeyler oldu. Yakında hallederiz.', 'error')
    return;
  }

  switch (action) {
    case 'upvote':
      err_msg = "Bu fantastik derdi sikebilmek için önce dert.gg'ye giriş yapmalısın.";
      break;
    case 'unvote':
      err_msg = "Bu derdi sikmekten vazgeçtin anlıyoruz ama önce dert.gg'ye giriş yapmalısın.";
      break;
  }

  if (topic && entry_id) {
    chrome.runtime.sendMessage({type: action, entryId: entry_id, topic: topic}, (resp) => {
      if (resp == 'unauthorized') {
	notify(err_msg, 'error')
      } else if (resp == 'timeout') {
	// in case there's a problem on the server side and we timeout
	notify('Hiçbir şey olmamış ise kesinlikle bir şeyler oldu. Yakında hallederiz.', 'error')
      }
    });
  }
};

// Send events
function notify(msg, category) {
  window.postMessage({type: 'dert_gg', msg: msg, category: category}, '*');
};

function create_dert_gg_button() {
  let button = document.createElement('a');

  button.classList.add('favorite-count');
  button.classList.add('dert-gg-button');
  button.setAttribute('data-action', 'upvote');
  button.innerHTML = 'derdini sikeyim';

  button.addEventListener('click', click_handler);

  return button;
};

function create_dert_gg_count() {
  let count = document.createElement('span');

  count.innerHTML = '(0)';
  count.style.verticalAlign = 'middle';
  count.classList.add('dert-gg-count');

  return count;
};

function append_dert_gg() {
  let entry_list = document.getElementById('entry-item-list');
  let feedback_container = entry_list.getElementsByClassName('feedback-container');

  Array.from(feedback_container).forEach(container => {
    let span = document.createElement('span');
    span.classList.add('favorite-links');

    // Add the button and the count elements
    span.append(create_dert_gg_button());
    span.append(create_dert_gg_count());

    container.lastChild.insertAdjacentElement('afterend', span);
  });
};

// This let's us inject a script which will be listening to our
// own notification messages so that we can use eksisozluk's own ek$i.addResponse
// to show users eksi native™ notifications.
function inject_message_listener() {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL('message_handler.js');
  (document.head||document.documentElement).appendChild(s);
};

let topic = construct_topic();

append_dert_gg();
inject_message_listener();
