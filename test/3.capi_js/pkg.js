mergeInto(LibraryManager.library, {
  js_add: function (a, b) {
    console.log("js_add");
    return a + b;
  },

  js_console_log_int: function (param) {
    console.log("js_console_log_int:" + param);

    console.log(window, document.querySelector("body"))
  },
});

// emcc capi_js.cc --js-library pkg.js -o capi_js.js