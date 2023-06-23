window.addEventListener(
  'message',
  (e) => {
    if (e.data.type == 'dert_gg') {
      window.ek$i.addResponse(e.data.msg, e.data.category);
    }
  },
  false
);
