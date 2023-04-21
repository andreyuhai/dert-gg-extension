import * as Sentry from "@sentry/browser";

Sentry.init({dsn: "<SENTRY_DSN>"})

// Get the subtopic from the URL and construct the topic(topic:subtopic)
// Topic is constant and defined in the backend
function constructTopic() {
  let url = document.URL
  let subtopic = url.match(/--(\d+)/)

  return subtopic ? "room:" + subtopic[1] : "room:lobby"
}

function click_handler() {
  let action = this.getAttribute('data-action')
  let entry_item = this.closest('li');
  let entry_id = entry_item.getAttribute('data-id');
  let dert_gg_count = this.nextElementSibling;

  if (topic && entry_id) {
    chrome.runtime.sendMessage({type: action, entryId: entry_id, topic: topic}, (resp) => {
      if (resp == 'unauthorized') {
	alert("Hoop! Bu fantastik derdi sikebilmek için önce dert.gg'ye giriş yapmalısın.");
      }
    });
  }
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

let topic = constructTopic();
append_dert_gg();
