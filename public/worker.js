self.onmessage = function (event) {
  const { type, args } = event.data;

  switch (type) {
    case "setTimeout": {
      const { delay, data } = args;
      setTimeout(() => {
        self.postMessage(data);
      }, delay);
      break;
    }
    case "fetch": {
      fetch(args.url)
        .then((response) => response.json())
        .then((data) => {
          self.postMessage(data);
        });
      break;
    }

    default:
      break;
  }
};
