var Module = typeof Module != "undefined" ? Module : {};

var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = (status, toThrow) => {
 throw toThrow;
};

var ENVIRONMENT_IS_WEB = typeof window == "object";

var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";

var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";

var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (Module["ENVIRONMENT"]) {
 throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
}

var scriptDirectory = "";

function locateFile(path) {
 if (Module["locateFile"]) {
  return Module["locateFile"](path, scriptDirectory);
 }
 return scriptDirectory + path;
}

var read_, readAsync, readBinary, setWindowTitle;

if (ENVIRONMENT_IS_NODE) {
 if (typeof process == "undefined" || !process.release || process.release.name !== "node") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
 var nodeVersion = process.versions.node;
 var numericVersion = nodeVersion.split(".").slice(0, 3);
 numericVersion = numericVersion[0] * 1e4 + numericVersion[1] * 100 + numericVersion[2].split("-")[0] * 1;
 var minVersion = 101900;
 if (numericVersion < 101900) {
  throw new Error("This emscripten-generated code requires node v10.19.19.0 (detected v" + nodeVersion + ")");
 }
 var fs = require("fs");
 var nodePath = require("path");
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = nodePath.dirname(scriptDirectory) + "/";
 } else {
  scriptDirectory = __dirname + "/";
 }
 read_ = (filename, binary) => {
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  return fs.readFileSync(filename, binary ? undefined : "utf8");
 };
 readBinary = filename => {
  var ret = read_(filename, true);
  if (!ret.buffer) {
   ret = new Uint8Array(ret);
  }
  assert(ret.buffer);
  return ret;
 };
 readAsync = (filename, onload, onerror, binary = true) => {
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  fs.readFile(filename, binary ? undefined : "utf8", (err, data) => {
   if (err) onerror(err); else onload(binary ? data.buffer : data);
  });
 };
 if (!Module["thisProgram"] && process.argv.length > 1) {
  thisProgram = process.argv[1].replace(/\\/g, "/");
 }
 arguments_ = process.argv.slice(2);
 if (typeof module != "undefined") {
  module["exports"] = Module;
 }
 process.on("uncaughtException", ex => {
  if (ex !== "unwind" && !(ex instanceof ExitStatus) && !(ex.context instanceof ExitStatus)) {
   throw ex;
  }
 });
 var nodeMajor = process.versions.node.split(".")[0];
 if (nodeMajor < 15) {
  process.on("unhandledRejection", reason => {
   throw reason;
  });
 }
 quit_ = (status, toThrow) => {
  process.exitCode = status;
  throw toThrow;
 };
 Module["inspect"] = () => "[Emscripten Module object]";
} else if (ENVIRONMENT_IS_SHELL) {
 if (typeof process == "object" && typeof require === "function" || typeof window == "object" || typeof importScripts == "function") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
 if (typeof read != "undefined") {
  read_ = f => {
   return read(f);
  };
 }
 readBinary = f => {
  let data;
  if (typeof readbuffer == "function") {
   return new Uint8Array(readbuffer(f));
  }
  data = read(f, "binary");
  assert(typeof data == "object");
  return data;
 };
 readAsync = (f, onload, onerror) => {
  setTimeout(() => onload(readBinary(f)), 0);
 };
 if (typeof clearTimeout == "undefined") {
  globalThis.clearTimeout = id => {};
 }
 if (typeof scriptArgs != "undefined") {
  arguments_ = scriptArgs;
 } else if (typeof arguments != "undefined") {
  arguments_ = arguments;
 }
 if (typeof quit == "function") {
  quit_ = (status, toThrow) => {
   setTimeout(() => {
    if (!(toThrow instanceof ExitStatus)) {
     let toLog = toThrow;
     if (toThrow && typeof toThrow == "object" && toThrow.stack) {
      toLog = [ toThrow, toThrow.stack ];
     }
     err("exiting due to exception: " + toLog);
    }
    quit(status);
   });
   throw toThrow;
  };
 }
 if (typeof print != "undefined") {
  if (typeof console == "undefined") console = {};
  console.log = print;
  console.warn = console.error = typeof printErr != "undefined" ? printErr : print;
 }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = self.location.href;
 } else if (typeof document != "undefined" && document.currentScript) {
  scriptDirectory = document.currentScript.src;
 }
 if (scriptDirectory.indexOf("blob:") !== 0) {
  scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
 } else {
  scriptDirectory = "";
 }
 if (!(typeof window == "object" || typeof importScripts == "function")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
 {
  read_ = url => {
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, false);
   xhr.send(null);
   return xhr.responseText;
  };
  if (ENVIRONMENT_IS_WORKER) {
   readBinary = url => {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.responseType = "arraybuffer";
    xhr.send(null);
    return new Uint8Array(xhr.response);
   };
  }
  readAsync = (url, onload, onerror) => {
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, true);
   xhr.responseType = "arraybuffer";
   xhr.onload = () => {
    if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
     onload(xhr.response);
     return;
    }
    onerror();
   };
   xhr.onerror = onerror;
   xhr.send(null);
  };
 }
 setWindowTitle = title => document.title = title;
} else {
 throw new Error("environment detection error");
}

var out = Module["print"] || console.log.bind(console);

var err = Module["printErr"] || console.warn.bind(console);

Object.assign(Module, moduleOverrides);

moduleOverrides = null;

checkIncomingModuleAPI();

if (Module["arguments"]) arguments_ = Module["arguments"];

legacyModuleProp("arguments", "arguments_");

if (Module["thisProgram"]) thisProgram = Module["thisProgram"];

legacyModuleProp("thisProgram", "thisProgram");

if (Module["quit"]) quit_ = Module["quit"];

legacyModuleProp("quit", "quit_");

assert(typeof Module["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");

assert(typeof Module["read"] == "undefined", "Module.read option was removed (modify read_ in JS)");

assert(typeof Module["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");

assert(typeof Module["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");

assert(typeof Module["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify setWindowTitle in JS)");

assert(typeof Module["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");

legacyModuleProp("read", "read_");

legacyModuleProp("readAsync", "readAsync");

legacyModuleProp("readBinary", "readBinary");

legacyModuleProp("setWindowTitle", "setWindowTitle");

var IDBFS = "IDBFS is no longer included by default; build with -lidbfs.js";

var PROXYFS = "PROXYFS is no longer included by default; build with -lproxyfs.js";

var WORKERFS = "WORKERFS is no longer included by default; build with -lworkerfs.js";

var NODEFS = "NODEFS is no longer included by default; build with -lnodefs.js";

assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");

var wasmBinary;

if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];

legacyModuleProp("wasmBinary", "wasmBinary");

var noExitRuntime = Module["noExitRuntime"] || true;

legacyModuleProp("noExitRuntime", "noExitRuntime");

if (typeof WebAssembly != "object") {
 abort("no native wasm support detected");
}

function getSafeHeapType(bytes, isFloat) {
 switch (bytes) {
 case 1:
  return "i8";

 case 2:
  return "i16";

 case 4:
  return isFloat ? "float" : "i32";

 case 8:
  return isFloat ? "double" : "i64";

 default:
  assert(0, `getSafeHeapType() invalid bytes=${bytes}`);
 }
}

function SAFE_HEAP_STORE(dest, value, bytes, isFloat) {
 if (dest <= 0) abort(`segmentation fault storing ${bytes} bytes to address ${dest}`);
 if (dest % bytes !== 0) abort(`alignment error storing to address ${dest}, which was expected to be aligned to a multiple of ${bytes}`);
 if (runtimeInitialized) {
  var brk = _sbrk() >>> 0;
  if (dest + bytes > brk) abort(`segmentation fault, exceeded the top of the available dynamic heap when storing ${bytes} bytes to address ${dest}. DYNAMICTOP=${brk}`);
  assert(brk >= _emscripten_stack_get_base(), `brk >= _emscripten_stack_get_base() (brk=${brk}, _emscripten_stack_get_base()=${_emscripten_stack_get_base()})`);
  assert(brk <= wasmMemory.buffer.byteLength, `brk <= wasmMemory.buffer.byteLength (brk=${brk}, wasmMemory.buffer.byteLength=${wasmMemory.buffer.byteLength})`);
 }
 setValue_safe(dest, value, getSafeHeapType(bytes, isFloat));
 return value;
}

function SAFE_HEAP_STORE_D(dest, value, bytes) {
 return SAFE_HEAP_STORE(dest, value, bytes, true);
}

function SAFE_HEAP_LOAD(dest, bytes, unsigned, isFloat) {
 if (dest <= 0) abort(`segmentation fault loading ${bytes} bytes from address ${dest}`);
 if (dest % bytes !== 0) abort(`alignment error loading from address ${dest}, which was expected to be aligned to a multiple of ${bytes}`);
 if (runtimeInitialized) {
  var brk = _sbrk() >>> 0;
  if (dest + bytes > brk) abort(`segmentation fault, exceeded the top of the available dynamic heap when loading ${bytes} bytes from address ${dest}. DYNAMICTOP=${brk}`);
  assert(brk >= _emscripten_stack_get_base(), `brk >= _emscripten_stack_get_base() (brk=${brk}, _emscripten_stack_get_base()=${_emscripten_stack_get_base()})`);
  assert(brk <= wasmMemory.buffer.byteLength, `brk <= wasmMemory.buffer.byteLength (brk=${brk}, wasmMemory.buffer.byteLength=${wasmMemory.buffer.byteLength})`);
 }
 var type = getSafeHeapType(bytes, isFloat);
 var ret = getValue_safe(dest, type);
 if (unsigned) ret = unSign(ret, parseInt(type.substr(1), 10));
 return ret;
}

function SAFE_HEAP_LOAD_D(dest, bytes, unsigned) {
 return SAFE_HEAP_LOAD(dest, bytes, unsigned, true);
}

function SAFE_FT_MASK(value, mask) {
 var ret = value & mask;
 if (ret !== value) {
  abort(`Function table mask error: function pointer is ${value} which is masked by ${mask}, the likely cause of this is that the function pointer is being called by the wrong type.`);
 }
 return ret;
}

function segfault() {
 abort("segmentation fault");
}

function alignfault() {
 abort("alignment fault");
}

var wasmMemory;

var ABORT = false;

var EXITSTATUS;

function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed" + (text ? ": " + text : ""));
 }
}

var HEAP, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateMemoryViews() {
 var b = wasmMemory.buffer;
 Module["HEAP8"] = HEAP8 = new Int8Array(b);
 Module["HEAP16"] = HEAP16 = new Int16Array(b);
 Module["HEAP32"] = HEAP32 = new Int32Array(b);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
}

assert(!Module["STACK_SIZE"], "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");

assert(typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined, "JS engine does not provide full typed array support");

assert(!Module["wasmMemory"], "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");

assert(!Module["INITIAL_MEMORY"], "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");

var wasmTable;

function writeStackCookie() {
 var max = _emscripten_stack_get_end();
 assert((max & 3) == 0);
 if (max == 0) {
  max += 4;
 }
 SAFE_HEAP_STORE((max >> 2) * 4, 34821223, 4);
 checkInt32(34821223);
 SAFE_HEAP_STORE((max + 4 >> 2) * 4, 2310721022, 4);
 checkInt32(2310721022);
}

function checkStackCookie() {
 if (ABORT) return;
 var max = _emscripten_stack_get_end();
 if (max == 0) {
  max += 4;
 }
 var cookie1 = SAFE_HEAP_LOAD((max >> 2) * 4, 4, 1);
 var cookie2 = SAFE_HEAP_LOAD((max + 4 >> 2) * 4, 4, 1);
 if (cookie1 != 34821223 || cookie2 != 2310721022) {
  abort("Stack overflow! Stack cookie has been overwritten at " + ptrToString(max) + ", expected hex dwords 0x89BACDFE and 0x2135467, but received " + ptrToString(cookie2) + " " + ptrToString(cookie1));
 }
}

(function() {
 var h16 = new Int16Array(1);
 var h8 = new Int8Array(h16.buffer);
 h16[0] = 25459;
 if (h8[0] !== 115 || h8[1] !== 99) throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
})();

var __ATPRERUN__ = [];

var __ATINIT__ = [];

var __ATMAIN__ = [];

var __ATEXIT__ = [];

var __ATPOSTRUN__ = [];

var runtimeInitialized = false;

var runtimeKeepaliveCounter = 0;

function keepRuntimeAlive() {
 return noExitRuntime || runtimeKeepaliveCounter > 0;
}

function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
 assert(!runtimeInitialized);
 runtimeInitialized = true;
 checkStackCookie();
 ___set_stack_limits(_emscripten_stack_get_base(), _emscripten_stack_get_end());
 callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
 checkStackCookie();
 callRuntimeCallbacks(__ATMAIN__);
}

function postRun() {
 checkStackCookie();
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
 __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
 __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {}

function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}

assert(Math.imul, "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

assert(Math.fround, "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

assert(Math.clz32, "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

assert(Math.trunc, "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

var runDependencyTracking = {};

function getUniqueRunDependency(id) {
 var orig = id;
 while (1) {
  if (!runDependencyTracking[id]) return id;
  id = orig + Math.random();
 }
}

function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (id) {
  assert(!runDependencyTracking[id]);
  runDependencyTracking[id] = 1;
  if (runDependencyWatcher === null && typeof setInterval != "undefined") {
   runDependencyWatcher = setInterval(() => {
    if (ABORT) {
     clearInterval(runDependencyWatcher);
     runDependencyWatcher = null;
     return;
    }
    var shown = false;
    for (var dep in runDependencyTracking) {
     if (!shown) {
      shown = true;
      err("still waiting on run dependencies:");
     }
     err("dependency: " + dep);
    }
    if (shown) {
     err("(end of list)");
    }
   }, 1e4);
  }
 } else {
  err("warning: run dependency added without ID");
 }
}

function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (id) {
  assert(runDependencyTracking[id]);
  delete runDependencyTracking[id];
 } else {
  err("warning: run dependency removed without ID");
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}

function abort(what) {
 if (Module["onAbort"]) {
  Module["onAbort"](what);
 }
 what = "Aborted(" + what + ")";
 err(what);
 ABORT = true;
 EXITSTATUS = 1;
 var e = new WebAssembly.RuntimeError(what);
 throw e;
}

var FS = {
 error: function() {
  abort("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM");
 },
 init: function() {
  FS.error();
 },
 createDataFile: function() {
  FS.error();
 },
 createPreloadedFile: function() {
  FS.error();
 },
 createLazyFile: function() {
  FS.error();
 },
 open: function() {
  FS.error();
 },
 mkdev: function() {
  FS.error();
 },
 registerDevice: function() {
  FS.error();
 },
 analyzePath: function() {
  FS.error();
 },
 ErrnoError: function ErrnoError() {
  FS.error();
 }
};

Module["FS_createDataFile"] = FS.createDataFile;

Module["FS_createPreloadedFile"] = FS.createPreloadedFile;

var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
 return filename.startsWith(dataURIPrefix);
}

function isFileURI(filename) {
 return filename.startsWith("file://");
}

function createExportWrapper(name, fixedasm) {
 return function() {
  var displayName = name;
  var asm = fixedasm;
  if (!fixedasm) {
   asm = Module["asm"];
  }
  assert(runtimeInitialized, "native function `" + displayName + "` called before runtime initialization");
  if (!asm[name]) {
   assert(asm[name], "exported native function `" + displayName + "` not found");
  }
  return asm[name].apply(null, arguments);
 };
}

var wasmBinaryFile;

wasmBinaryFile = "duktape_example_2.wasm";

if (!isDataURI(wasmBinaryFile)) {
 wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary(file) {
 try {
  if (file == wasmBinaryFile && wasmBinary) {
   return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
   return readBinary(file);
  }
  throw "both async and sync fetching of the wasm failed";
 } catch (err) {
  abort(err);
 }
}

function getBinaryPromise(binaryFile) {
 if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
  if (typeof fetch == "function" && !isFileURI(binaryFile)) {
   return fetch(binaryFile, {
    credentials: "same-origin"
   }).then(response => {
    if (!response["ok"]) {
     throw "failed to load wasm binary file at '" + binaryFile + "'";
    }
    return response["arrayBuffer"]();
   }).catch(() => getBinary(binaryFile));
  } else {
   if (readAsync) {
    return new Promise((resolve, reject) => {
     readAsync(binaryFile, response => resolve(new Uint8Array(response)), reject);
    });
   }
  }
 }
 return Promise.resolve().then(() => getBinary(binaryFile));
}

function instantiateArrayBuffer(binaryFile, imports, receiver) {
 return getBinaryPromise(binaryFile).then(binary => {
  return WebAssembly.instantiate(binary, imports);
 }).then(instance => {
  return instance;
 }).then(receiver, reason => {
  err("failed to asynchronously prepare wasm: " + reason);
  if (isFileURI(wasmBinaryFile)) {
   err("warning: Loading from a file URI (" + wasmBinaryFile + ") is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing");
  }
  abort(reason);
 });
}

function instantiateAsync(binary, binaryFile, imports, callback) {
 if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
  return fetch(binaryFile, {
   credentials: "same-origin"
  }).then(response => {
   var result = WebAssembly.instantiateStreaming(response, imports);
   return result.then(callback, function(reason) {
    err("wasm streaming compile failed: " + reason);
    err("falling back to ArrayBuffer instantiation");
    return instantiateArrayBuffer(binaryFile, imports, callback);
   });
  });
 } else {
  return instantiateArrayBuffer(binaryFile, imports, callback);
 }
}

function createWasm() {
 var info = {
  "env": wasmImports,
  "wasi_snapshot_preview1": wasmImports
 };
 function receiveInstance(instance, module) {
  var exports = instance.exports;
  Module["asm"] = exports;
  wasmMemory = Module["asm"]["memory"];
  assert(wasmMemory, "memory not found in wasm exports");
  updateMemoryViews();
  wasmTable = Module["asm"]["__indirect_function_table"];
  assert(wasmTable, "table not found in wasm exports");
  addOnInit(Module["asm"]["__wasm_call_ctors"]);
  removeRunDependency("wasm-instantiate");
  return exports;
 }
 addRunDependency("wasm-instantiate");
 var trueModule = Module;
 function receiveInstantiationResult(result) {
  assert(Module === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
  trueModule = null;
  receiveInstance(result["instance"]);
 }
 if (Module["instantiateWasm"]) {
  try {
   return Module["instantiateWasm"](info, receiveInstance);
  } catch (e) {
   err("Module.instantiateWasm callback failed with error: " + e);
   return false;
  }
 }
 instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult);
 return {};
}

var tempDouble;

var tempI64;

function legacyModuleProp(prop, newName) {
 if (!Object.getOwnPropertyDescriptor(Module, prop)) {
  Object.defineProperty(Module, prop, {
   configurable: true,
   get: function() {
    abort("Module." + prop + " has been replaced with plain " + newName + " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)");
   }
  });
 }
}

function ignoredModuleProp(prop) {
 if (Object.getOwnPropertyDescriptor(Module, prop)) {
  abort("`Module." + prop + "` was supplied but `" + prop + "` not included in INCOMING_MODULE_JS_API");
 }
}

function isExportedByForceFilesystem(name) {
 return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
}

function missingGlobal(sym, msg) {
 if (typeof globalThis !== "undefined") {
  Object.defineProperty(globalThis, sym, {
   configurable: true,
   get: function() {
    warnOnce("`" + sym + "` is not longer defined by emscripten. " + msg);
    return undefined;
   }
  });
 }
}

missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");

function missingLibrarySymbol(sym) {
 if (typeof globalThis !== "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
  Object.defineProperty(globalThis, sym, {
   configurable: true,
   get: function() {
    var msg = "`" + sym + "` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line";
    var librarySymbol = sym;
    if (!librarySymbol.startsWith("_")) {
     librarySymbol = "$" + sym;
    }
    msg += " (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=" + librarySymbol + ")";
    if (isExportedByForceFilesystem(sym)) {
     msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
    }
    warnOnce(msg);
    return undefined;
   }
  });
 }
 unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
 if (!Object.getOwnPropertyDescriptor(Module, sym)) {
  Object.defineProperty(Module, sym, {
   configurable: true,
   get: function() {
    var msg = "'" + sym + "' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)";
    if (isExportedByForceFilesystem(sym)) {
     msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
    }
    abort(msg);
   }
  });
 }
}

var MAX_UINT8 = 2 ** 8 - 1;

var MAX_UINT16 = 2 ** 16 - 1;

var MAX_UINT32 = 2 ** 32 - 1;

var MAX_UINT53 = 2 ** 53 - 1;

var MAX_UINT64 = 2 ** 64 - 1;

var MIN_INT8 = -(2 ** (8 - 1)) + 1;

var MIN_INT16 = -(2 ** (16 - 1)) + 1;

var MIN_INT32 = -(2 ** (32 - 1)) + 1;

var MIN_INT53 = -(2 ** (53 - 1)) + 1;

var MIN_INT64 = -(2 ** (64 - 1)) + 1;

function checkInt(value, bits, min, max) {
 assert(Number.isInteger(Number(value)), "attempt to write non-integer (" + value + ") into integer heap");
 assert(value <= max, "value (" + value + ") too large to write as " + bits + "-bit value");
 assert(value >= min, "value (" + value + ") too small to write as " + bits + "-bit value");
}

var checkInt1 = value => checkInt(value, 1, 1);

var checkInt8 = value => checkInt(value, 8, MIN_INT8, MAX_UINT8);

var checkInt16 = value => checkInt(value, 16, MIN_INT16, MAX_UINT16);

var checkInt32 = value => checkInt(value, 32, MIN_INT32, MAX_UINT32);

var checkInt53 = value => checkInt(value, 53, MIN_INT53, MAX_UINT53);

var checkInt64 = value => checkInt(value, 64, MIN_INT64, MAX_UINT64);

function dbg(text) {
 console.error.apply(console, arguments);
}

function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = "Program terminated with exit(" + status + ")";
 this.status = status;
}

function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  callbacks.shift()(Module);
 }
}

function getValue(ptr, type = "i8") {
 if (type.endsWith("*")) type = "*";
 switch (type) {
 case "i1":
  return SAFE_HEAP_LOAD(ptr >> 0, 1, 0);

 case "i8":
  return SAFE_HEAP_LOAD(ptr >> 0, 1, 0);

 case "i16":
  return SAFE_HEAP_LOAD((ptr >> 1) * 2, 2, 0);

 case "i32":
  return SAFE_HEAP_LOAD((ptr >> 2) * 4, 4, 0);

 case "i64":
  return SAFE_HEAP_LOAD((ptr >> 2) * 4, 4, 0);

 case "float":
  return SAFE_HEAP_LOAD_D((ptr >> 2) * 4, 4, 0);

 case "double":
  return SAFE_HEAP_LOAD_D((ptr >> 3) * 8, 8, 0);

 case "*":
  return SAFE_HEAP_LOAD((ptr >> 2) * 4, 4, 1);

 default:
  abort("invalid type for getValue: " + type);
 }
}

function getValue_safe(ptr, type = "i8") {
 if (type.endsWith("*")) type = "*";
 switch (type) {
 case "i1":
  return HEAP8[ptr >> 0];

 case "i8":
  return HEAP8[ptr >> 0];

 case "i16":
  return HEAP16[ptr >> 1];

 case "i32":
  return HEAP32[ptr >> 2];

 case "i64":
  return HEAP32[ptr >> 2];

 case "float":
  return HEAPF32[ptr >> 2];

 case "double":
  return HEAPF64[ptr >> 3];

 case "*":
  return HEAPU32[ptr >> 2];

 default:
  abort("invalid type for getValue: " + type);
 }
}

function ptrToString(ptr) {
 assert(typeof ptr === "number");
 return "0x" + ptr.toString(16).padStart(8, "0");
}

function setValue(ptr, value, type = "i8") {
 if (type.endsWith("*")) type = "*";
 switch (type) {
 case "i1":
  SAFE_HEAP_STORE(ptr >> 0, value, 1);
  checkInt8(value);
  break;

 case "i8":
  SAFE_HEAP_STORE(ptr >> 0, value, 1);
  checkInt8(value);
  break;

 case "i16":
  SAFE_HEAP_STORE((ptr >> 1) * 2, value, 2);
  checkInt16(value);
  break;

 case "i32":
  SAFE_HEAP_STORE((ptr >> 2) * 4, value, 4);
  checkInt32(value);
  break;

 case "i64":
  tempI64 = [ value >>> 0, (tempDouble = value, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
  SAFE_HEAP_STORE((ptr >> 2) * 4, tempI64[0], 4), SAFE_HEAP_STORE((ptr + 4 >> 2) * 4, tempI64[1], 4);
  checkInt64(value);
  break;

 case "float":
  SAFE_HEAP_STORE_D((ptr >> 2) * 4, value, 4);
  break;

 case "double":
  SAFE_HEAP_STORE_D((ptr >> 3) * 8, value, 8);
  break;

 case "*":
  SAFE_HEAP_STORE((ptr >> 2) * 4, value, 4);
  break;

 default:
  abort("invalid type for setValue: " + type);
 }
}

function setValue_safe(ptr, value, type = "i8") {
 if (type.endsWith("*")) type = "*";
 switch (type) {
 case "i1":
  HEAP8[ptr >> 0] = value;
  checkInt8(value);
  break;

 case "i8":
  HEAP8[ptr >> 0] = value;
  checkInt8(value);
  break;

 case "i16":
  HEAP16[ptr >> 1] = value;
  checkInt16(value);
  break;

 case "i32":
  HEAP32[ptr >> 2] = value;
  checkInt32(value);
  break;

 case "i64":
  tempI64 = [ value >>> 0, (tempDouble = value, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
  HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
  checkInt64(value);
  break;

 case "float":
  HEAPF32[ptr >> 2] = value;
  break;

 case "double":
  HEAPF64[ptr >> 3] = value;
  break;

 case "*":
  HEAPU32[ptr >> 2] = value;
  break;

 default:
  abort("invalid type for setValue: " + type);
 }
}

function unSign(value, bits) {
 if (value >= 0) {
  return value;
 }
 return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value;
}

function warnOnce(text) {
 if (!warnOnce.shown) warnOnce.shown = {};
 if (!warnOnce.shown[text]) {
  warnOnce.shown[text] = 1;
  if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
  err(text);
 }
}

function ExceptionInfo(excPtr) {
 this.excPtr = excPtr;
 this.ptr = excPtr - 24;
 this.set_type = function(type) {
  SAFE_HEAP_STORE((this.ptr + 4 >> 2) * 4, type, 4);
 };
 this.get_type = function() {
  return SAFE_HEAP_LOAD((this.ptr + 4 >> 2) * 4, 4, 1);
 };
 this.set_destructor = function(destructor) {
  SAFE_HEAP_STORE((this.ptr + 8 >> 2) * 4, destructor, 4);
 };
 this.get_destructor = function() {
  return SAFE_HEAP_LOAD((this.ptr + 8 >> 2) * 4, 4, 1);
 };
 this.set_caught = function(caught) {
  caught = caught ? 1 : 0;
  SAFE_HEAP_STORE(this.ptr + 12 >> 0, caught, 1);
  checkInt8(caught);
 };
 this.get_caught = function() {
  return SAFE_HEAP_LOAD(this.ptr + 12 >> 0, 1, 0) != 0;
 };
 this.set_rethrown = function(rethrown) {
  rethrown = rethrown ? 1 : 0;
  SAFE_HEAP_STORE(this.ptr + 13 >> 0, rethrown, 1);
  checkInt8(rethrown);
 };
 this.get_rethrown = function() {
  return SAFE_HEAP_LOAD(this.ptr + 13 >> 0, 1, 0) != 0;
 };
 this.init = function(type, destructor) {
  this.set_adjusted_ptr(0);
  this.set_type(type);
  this.set_destructor(destructor);
 };
 this.set_adjusted_ptr = function(adjustedPtr) {
  SAFE_HEAP_STORE((this.ptr + 16 >> 2) * 4, adjustedPtr, 4);
 };
 this.get_adjusted_ptr = function() {
  return SAFE_HEAP_LOAD((this.ptr + 16 >> 2) * 4, 4, 1);
 };
 this.get_exception_ptr = function() {
  var isPointer = ___cxa_is_pointer_type(this.get_type());
  if (isPointer) {
   return SAFE_HEAP_LOAD((this.excPtr >> 2) * 4, 4, 1);
  }
  var adjusted = this.get_adjusted_ptr();
  if (adjusted !== 0) return adjusted;
  return this.excPtr;
 };
}

var exceptionLast = 0;

var uncaughtExceptionCount = 0;

function ___cxa_throw(ptr, type, destructor) {
 var info = new ExceptionInfo(ptr);
 info.init(type, destructor);
 exceptionLast = ptr;
 uncaughtExceptionCount++;
 assert(false, "Exception thrown, but exception catching is not enabled. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.");
}

function ___handle_stack_overflow(requested) {
 requested = requested >>> 0;
 var base = _emscripten_stack_get_base();
 var end = _emscripten_stack_get_end();
 abort(`stack overflow (Attempt to set SP to ${ptrToString(requested)}` + `, with stack limits [${ptrToString(end)} - ${ptrToString(base)}` + "]). If you require more stack space build with -sSTACK_SIZE=<bytes>");
}

function __emscripten_fetch_free(id) {
 var xhr = Fetch.xhrs[id];
 if (xhr) {
  delete Fetch.xhrs[id];
  if (xhr.readyState > 0 && xhr.readyState < 4) {
   xhr.abort();
  }
 }
}

function __emscripten_throw_longjmp() {
 throw Infinity;
}

function readI53FromI64(ptr) {
 return SAFE_HEAP_LOAD((ptr >> 2) * 4, 4, 1) + SAFE_HEAP_LOAD((ptr + 4 >> 2) * 4, 4, 0) * 4294967296;
}

function __gmtime_js(time, tmPtr) {
 var date = new Date(readI53FromI64(time) * 1e3);
 SAFE_HEAP_STORE((tmPtr >> 2) * 4, date.getUTCSeconds(), 4);
 checkInt32(date.getUTCSeconds());
 SAFE_HEAP_STORE((tmPtr + 4 >> 2) * 4, date.getUTCMinutes(), 4);
 checkInt32(date.getUTCMinutes());
 SAFE_HEAP_STORE((tmPtr + 8 >> 2) * 4, date.getUTCHours(), 4);
 checkInt32(date.getUTCHours());
 SAFE_HEAP_STORE((tmPtr + 12 >> 2) * 4, date.getUTCDate(), 4);
 checkInt32(date.getUTCDate());
 SAFE_HEAP_STORE((tmPtr + 16 >> 2) * 4, date.getUTCMonth(), 4);
 checkInt32(date.getUTCMonth());
 SAFE_HEAP_STORE((tmPtr + 20 >> 2) * 4, date.getUTCFullYear() - 1900, 4);
 checkInt32(date.getUTCFullYear() - 1900);
 SAFE_HEAP_STORE((tmPtr + 24 >> 2) * 4, date.getUTCDay(), 4);
 checkInt32(date.getUTCDay());
 var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
 var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
 SAFE_HEAP_STORE((tmPtr + 28 >> 2) * 4, yday, 4);
 checkInt32(yday);
}

function isLeapYear(year) {
 return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

var MONTH_DAYS_LEAP_CUMULATIVE = [ 0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335 ];

var MONTH_DAYS_REGULAR_CUMULATIVE = [ 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ];

function ydayFromDate(date) {
 var leap = isLeapYear(date.getFullYear());
 var monthDaysCumulative = leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE;
 var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
 return yday;
}

function __localtime_js(time, tmPtr) {
 var date = new Date(readI53FromI64(time) * 1e3);
 SAFE_HEAP_STORE((tmPtr >> 2) * 4, date.getSeconds(), 4);
 checkInt32(date.getSeconds());
 SAFE_HEAP_STORE((tmPtr + 4 >> 2) * 4, date.getMinutes(), 4);
 checkInt32(date.getMinutes());
 SAFE_HEAP_STORE((tmPtr + 8 >> 2) * 4, date.getHours(), 4);
 checkInt32(date.getHours());
 SAFE_HEAP_STORE((tmPtr + 12 >> 2) * 4, date.getDate(), 4);
 checkInt32(date.getDate());
 SAFE_HEAP_STORE((tmPtr + 16 >> 2) * 4, date.getMonth(), 4);
 checkInt32(date.getMonth());
 SAFE_HEAP_STORE((tmPtr + 20 >> 2) * 4, date.getFullYear() - 1900, 4);
 checkInt32(date.getFullYear() - 1900);
 SAFE_HEAP_STORE((tmPtr + 24 >> 2) * 4, date.getDay(), 4);
 checkInt32(date.getDay());
 var yday = ydayFromDate(date) | 0;
 SAFE_HEAP_STORE((tmPtr + 28 >> 2) * 4, yday, 4);
 checkInt32(yday);
 SAFE_HEAP_STORE((tmPtr + 36 >> 2) * 4, -(date.getTimezoneOffset() * 60), 4);
 checkInt32(-(date.getTimezoneOffset() * 60));
 var start = new Date(date.getFullYear(), 0, 1);
 var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
 var winterOffset = start.getTimezoneOffset();
 var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
 SAFE_HEAP_STORE((tmPtr + 32 >> 2) * 4, dst, 4);
 checkInt32(dst);
}

function __mktime_js(tmPtr) {
 var date = new Date(SAFE_HEAP_LOAD((tmPtr + 20 >> 2) * 4, 4, 0) + 1900, SAFE_HEAP_LOAD((tmPtr + 16 >> 2) * 4, 4, 0), SAFE_HEAP_LOAD((tmPtr + 12 >> 2) * 4, 4, 0), SAFE_HEAP_LOAD((tmPtr + 8 >> 2) * 4, 4, 0), SAFE_HEAP_LOAD((tmPtr + 4 >> 2) * 4, 4, 0), SAFE_HEAP_LOAD((tmPtr >> 2) * 4, 4, 0), 0);
 var dst = SAFE_HEAP_LOAD((tmPtr + 32 >> 2) * 4, 4, 0);
 var guessedOffset = date.getTimezoneOffset();
 var start = new Date(date.getFullYear(), 0, 1);
 var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
 var winterOffset = start.getTimezoneOffset();
 var dstOffset = Math.min(winterOffset, summerOffset);
 if (dst < 0) {
  SAFE_HEAP_STORE((tmPtr + 32 >> 2) * 4, Number(summerOffset != winterOffset && dstOffset == guessedOffset), 4);
  checkInt32(Number(summerOffset != winterOffset && dstOffset == guessedOffset));
 } else if (dst > 0 != (dstOffset == guessedOffset)) {
  var nonDstOffset = Math.max(winterOffset, summerOffset);
  var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
  date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
 }
 SAFE_HEAP_STORE((tmPtr + 24 >> 2) * 4, date.getDay(), 4);
 checkInt32(date.getDay());
 var yday = ydayFromDate(date) | 0;
 SAFE_HEAP_STORE((tmPtr + 28 >> 2) * 4, yday, 4);
 checkInt32(yday);
 SAFE_HEAP_STORE((tmPtr >> 2) * 4, date.getSeconds(), 4);
 checkInt32(date.getSeconds());
 SAFE_HEAP_STORE((tmPtr + 4 >> 2) * 4, date.getMinutes(), 4);
 checkInt32(date.getMinutes());
 SAFE_HEAP_STORE((tmPtr + 8 >> 2) * 4, date.getHours(), 4);
 checkInt32(date.getHours());
 SAFE_HEAP_STORE((tmPtr + 12 >> 2) * 4, date.getDate(), 4);
 checkInt32(date.getDate());
 SAFE_HEAP_STORE((tmPtr + 16 >> 2) * 4, date.getMonth(), 4);
 checkInt32(date.getMonth());
 SAFE_HEAP_STORE((tmPtr + 20 >> 2) * 4, date.getYear(), 4);
 checkInt32(date.getYear());
 return date.getTime() / 1e3 | 0;
}

function lengthBytesUTF8(str) {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var c = str.charCodeAt(i);
  if (c <= 127) {
   len++;
  } else if (c <= 2047) {
   len += 2;
  } else if (c >= 55296 && c <= 57343) {
   len += 4;
   ++i;
  } else {
   len += 3;
  }
 }
 return len;
}

function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
 assert(typeof str === "string");
 if (!(maxBytesToWrite > 0)) return 0;
 var startIdx = outIdx;
 var endIdx = outIdx + maxBytesToWrite - 1;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) {
   var u1 = str.charCodeAt(++i);
   u = 65536 + ((u & 1023) << 10) | u1 & 1023;
  }
  if (u <= 127) {
   if (outIdx >= endIdx) break;
   heap[outIdx++] = u;
  } else if (u <= 2047) {
   if (outIdx + 1 >= endIdx) break;
   heap[outIdx++] = 192 | u >> 6;
   heap[outIdx++] = 128 | u & 63;
  } else if (u <= 65535) {
   if (outIdx + 2 >= endIdx) break;
   heap[outIdx++] = 224 | u >> 12;
   heap[outIdx++] = 128 | u >> 6 & 63;
   heap[outIdx++] = 128 | u & 63;
  } else {
   if (outIdx + 3 >= endIdx) break;
   if (u > 1114111) warnOnce("Invalid Unicode code point " + ptrToString(u) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
   heap[outIdx++] = 240 | u >> 18;
   heap[outIdx++] = 128 | u >> 12 & 63;
   heap[outIdx++] = 128 | u >> 6 & 63;
   heap[outIdx++] = 128 | u & 63;
  }
 }
 heap[outIdx] = 0;
 return outIdx - startIdx;
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
 assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
 return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}

function stringToNewUTF8(str) {
 var size = lengthBytesUTF8(str) + 1;
 var ret = _malloc(size);
 if (ret) stringToUTF8(str, ret, size);
 return ret;
}

function __tzset_js(timezone, daylight, tzname) {
 var currentYear = new Date().getFullYear();
 var winter = new Date(currentYear, 0, 1);
 var summer = new Date(currentYear, 6, 1);
 var winterOffset = winter.getTimezoneOffset();
 var summerOffset = summer.getTimezoneOffset();
 var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
 SAFE_HEAP_STORE((timezone >> 2) * 4, stdTimezoneOffset * 60, 4);
 checkInt32(stdTimezoneOffset * 60);
 SAFE_HEAP_STORE((daylight >> 2) * 4, Number(winterOffset != summerOffset), 4);
 checkInt32(Number(winterOffset != summerOffset));
 function extractZone(date) {
  var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
  return match ? match[1] : "GMT";
 }
 var winterName = extractZone(winter);
 var summerName = extractZone(summer);
 var winterNamePtr = stringToNewUTF8(winterName);
 var summerNamePtr = stringToNewUTF8(summerName);
 if (summerOffset < winterOffset) {
  SAFE_HEAP_STORE((tzname >> 2) * 4, winterNamePtr, 4);
  checkInt32(winterNamePtr);
  SAFE_HEAP_STORE((tzname + 4 >> 2) * 4, summerNamePtr, 4);
  checkInt32(summerNamePtr);
 } else {
  SAFE_HEAP_STORE((tzname >> 2) * 4, summerNamePtr, 4);
  checkInt32(summerNamePtr);
  SAFE_HEAP_STORE((tzname + 4 >> 2) * 4, winterNamePtr, 4);
  checkInt32(winterNamePtr);
 }
}

function _abort() {
 abort("native code called abort()");
}

function _emscripten_date_now() {
 return Date.now();
}

function _emscripten_is_main_browser_thread() {
 return !ENVIRONMENT_IS_WORKER;
}

function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.copyWithin(dest, src, src + num);
}

function getHeapMax() {
 return HEAPU8.length;
}

var _emscripten_get_now;

if (ENVIRONMENT_IS_NODE) {
 _emscripten_get_now = () => {
  var t = process.hrtime();
  return t[0] * 1e3 + t[1] / 1e6;
 };
} else _emscripten_get_now = () => performance.now();

function abortOnCannotGrowMemory(requestedSize) {
 abort(`Cannot enlarge memory arrays to size ${requestedSize} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${HEAP8.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);
}

function _emscripten_resize_heap(requestedSize) {
 var oldSize = HEAPU8.length;
 requestedSize = requestedSize >>> 0;
 abortOnCannotGrowMemory(requestedSize);
}

var Fetch = {
 xhrs: {},
 openDatabase: function(dbname, dbversion, onsuccess, onerror) {
  try {
   var openRequest = indexedDB.open(dbname, dbversion);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = event => {
   var db = event.target.result;
   if (db.objectStoreNames.contains("FILES")) {
    db.deleteObjectStore("FILES");
   }
   db.createObjectStore("FILES");
  };
  openRequest.onsuccess = event => onsuccess(event.target.result);
  openRequest.onerror = error => onerror(error);
 },
 staticInit: function() {
  var onsuccess = db => {
   Fetch.dbInstance = db;
   removeRunDependency("library_fetch_init");
  };
  var onerror = () => {
   Fetch.dbInstance = false;
   removeRunDependency("library_fetch_init");
  };
  addRunDependency("library_fetch_init");
  Fetch.openDatabase("emscripten_filesystem", 1, onsuccess, onerror);
 }
};

var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
 var endIdx = idx + maxBytesToRead;
 var endPtr = idx;
 while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
 if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
  return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
 }
 var str = "";
 while (idx < endPtr) {
  var u0 = heapOrArray[idx++];
  if (!(u0 & 128)) {
   str += String.fromCharCode(u0);
   continue;
  }
  var u1 = heapOrArray[idx++] & 63;
  if ((u0 & 224) == 192) {
   str += String.fromCharCode((u0 & 31) << 6 | u1);
   continue;
  }
  var u2 = heapOrArray[idx++] & 63;
  if ((u0 & 240) == 224) {
   u0 = (u0 & 15) << 12 | u1 << 6 | u2;
  } else {
   if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte " + ptrToString(u0) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
   u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
  }
  if (u0 < 65536) {
   str += String.fromCharCode(u0);
  } else {
   var ch = u0 - 65536;
   str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
  }
 }
 return str;
}

function UTF8ToString(ptr, maxBytesToRead) {
 assert(typeof ptr == "number");
 return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
}

function fetchXHR(fetch, onsuccess, onerror, onprogress, onreadystatechange) {
 var url = SAFE_HEAP_LOAD((fetch + 8 >> 2) * 4, 4, 1);
 if (!url) {
  onerror(fetch, 0, "no url specified!");
  return;
 }
 var url_ = UTF8ToString(url);
 var fetch_attr = fetch + 112;
 var requestMethod = UTF8ToString(fetch_attr);
 if (!requestMethod) requestMethod = "GET";
 var userData = SAFE_HEAP_LOAD((fetch_attr + 4 >> 2) * 4, 4, 1);
 var fetchAttributes = SAFE_HEAP_LOAD((fetch_attr + 52 >> 2) * 4, 4, 1);
 var timeoutMsecs = SAFE_HEAP_LOAD((fetch_attr + 56 >> 2) * 4, 4, 1);
 var withCredentials = !!SAFE_HEAP_LOAD(fetch_attr + 60 >> 0, 1, 1);
 var destinationPath = SAFE_HEAP_LOAD((fetch_attr + 64 >> 2) * 4, 4, 1);
 var userName = SAFE_HEAP_LOAD((fetch_attr + 68 >> 2) * 4, 4, 1);
 var password = SAFE_HEAP_LOAD((fetch_attr + 72 >> 2) * 4, 4, 1);
 var requestHeaders = SAFE_HEAP_LOAD((fetch_attr + 76 >> 2) * 4, 4, 1);
 var overriddenMimeType = SAFE_HEAP_LOAD((fetch_attr + 80 >> 2) * 4, 4, 1);
 var dataPtr = SAFE_HEAP_LOAD((fetch_attr + 84 >> 2) * 4, 4, 1);
 var dataLength = SAFE_HEAP_LOAD((fetch_attr + 88 >> 2) * 4, 4, 1);
 var fetchAttrLoadToMemory = !!(fetchAttributes & 1);
 var fetchAttrStreamData = !!(fetchAttributes & 2);
 var fetchAttrPersistFile = !!(fetchAttributes & 4);
 var fetchAttrAppend = !!(fetchAttributes & 8);
 var fetchAttrReplace = !!(fetchAttributes & 16);
 var fetchAttrSynchronous = !!(fetchAttributes & 64);
 var fetchAttrWaitable = !!(fetchAttributes & 128);
 var userNameStr = userName ? UTF8ToString(userName) : undefined;
 var passwordStr = password ? UTF8ToString(password) : undefined;
 var xhr = new XMLHttpRequest();
 xhr.withCredentials = withCredentials;
 xhr.open(requestMethod, url_, !fetchAttrSynchronous, userNameStr, passwordStr);
 if (!fetchAttrSynchronous) xhr.timeout = timeoutMsecs;
 xhr.url_ = url_;
 assert(!fetchAttrStreamData, "streaming uses moz-chunked-arraybuffer which is no longer supported; TODO: rewrite using fetch()");
 xhr.responseType = "arraybuffer";
 if (overriddenMimeType) {
  var overriddenMimeTypeStr = UTF8ToString(overriddenMimeType);
  xhr.overrideMimeType(overriddenMimeTypeStr);
 }
 if (requestHeaders) {
  for (;;) {
   var key = SAFE_HEAP_LOAD((requestHeaders >> 2) * 4, 4, 1);
   if (!key) break;
   var value = SAFE_HEAP_LOAD((requestHeaders + 4 >> 2) * 4, 4, 1);
   if (!value) break;
   requestHeaders += 8;
   var keyStr = UTF8ToString(key);
   var valueStr = UTF8ToString(value);
   xhr.setRequestHeader(keyStr, valueStr);
  }
 }
 var id = SAFE_HEAP_LOAD((fetch >> 2) * 4, 4, 1);
 Fetch.xhrs[id] = xhr;
 var data = dataPtr && dataLength ? HEAPU8.slice(dataPtr, dataPtr + dataLength) : null;
 function saveResponseAndStatus() {
  var ptr = 0;
  var ptrLen = 0;
  if (xhr.response && fetchAttrLoadToMemory && SAFE_HEAP_LOAD((fetch + 12 >> 2) * 4, 4, 1) === 0) {
   ptrLen = xhr.response.byteLength;
  }
  if (ptrLen > 0) {
   ptr = _malloc(ptrLen);
   HEAPU8.set(new Uint8Array(xhr.response), ptr);
  }
  SAFE_HEAP_STORE((fetch + 12 >> 2) * 4, ptr, 4);
  writeI53ToI64(fetch + 16, ptrLen);
  writeI53ToI64(fetch + 24, 0);
  var len = xhr.response ? xhr.response.byteLength : 0;
  if (len) {
   writeI53ToI64(fetch + 32, len);
  }
  SAFE_HEAP_STORE((fetch + 40 >> 1) * 2, xhr.readyState, 2);
  SAFE_HEAP_STORE((fetch + 42 >> 1) * 2, xhr.status, 2);
  if (xhr.statusText) stringToUTF8(xhr.statusText, fetch + 44, 64);
 }
 xhr.onload = e => {
  if (!(id in Fetch.xhrs)) {
   return;
  }
  saveResponseAndStatus();
  if (xhr.status >= 200 && xhr.status < 300) {
   if (onsuccess) onsuccess(fetch, xhr, e);
  } else {
   if (onerror) onerror(fetch, xhr, e);
  }
 };
 xhr.onerror = e => {
  if (!(id in Fetch.xhrs)) {
   return;
  }
  saveResponseAndStatus();
  if (onerror) onerror(fetch, xhr, e);
 };
 xhr.ontimeout = e => {
  if (!(id in Fetch.xhrs)) {
   return;
  }
  if (onerror) onerror(fetch, xhr, e);
 };
 xhr.onprogress = e => {
  if (!(id in Fetch.xhrs)) {
   return;
  }
  var ptrLen = fetchAttrLoadToMemory && fetchAttrStreamData && xhr.response ? xhr.response.byteLength : 0;
  var ptr = 0;
  if (ptrLen > 0 && fetchAttrLoadToMemory && fetchAttrStreamData) {
   assert(onprogress, "When doing a streaming fetch, you should have an onprogress handler registered to receive the chunks!");
   ptr = _malloc(ptrLen);
   HEAPU8.set(new Uint8Array(xhr.response), ptr);
  }
  SAFE_HEAP_STORE((fetch + 12 >> 2) * 4, ptr, 4);
  writeI53ToI64(fetch + 16, ptrLen);
  writeI53ToI64(fetch + 24, e.loaded - ptrLen);
  writeI53ToI64(fetch + 32, e.total);
  SAFE_HEAP_STORE((fetch + 40 >> 1) * 2, xhr.readyState, 2);
  if (xhr.readyState >= 3 && xhr.status === 0 && e.loaded > 0) xhr.status = 200;
  SAFE_HEAP_STORE((fetch + 42 >> 1) * 2, xhr.status, 2);
  if (xhr.statusText) stringToUTF8(xhr.statusText, fetch + 44, 64);
  if (onprogress) onprogress(fetch, xhr, e);
  if (ptr) {
   _free(ptr);
  }
 };
 xhr.onreadystatechange = e => {
  if (!(id in Fetch.xhrs)) {
   return;
  }
  SAFE_HEAP_STORE((fetch + 40 >> 1) * 2, xhr.readyState, 2);
  if (xhr.readyState >= 2) {
   SAFE_HEAP_STORE((fetch + 42 >> 1) * 2, xhr.status, 2);
  }
  if (onreadystatechange) onreadystatechange(fetch, xhr, e);
 };
 try {
  xhr.send(data);
 } catch (e) {
  if (onerror) onerror(fetch, xhr, e);
 }
}

function handleException(e) {
 if (e instanceof ExitStatus || e == "unwind") {
  return EXITSTATUS;
 }
 checkStackCookie();
 if (e instanceof WebAssembly.RuntimeError) {
  if (_emscripten_stack_get_current() <= 0) {
   err("Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to " + 65536 + ")");
  }
 }
 quit_(1, e);
}

var SYSCALLS = {
 varargs: undefined,
 get: function() {
  assert(SYSCALLS.varargs != undefined);
  SYSCALLS.varargs += 4;
  var ret = SAFE_HEAP_LOAD((SYSCALLS.varargs - 4 >> 2) * 4, 4, 0);
  return ret;
 },
 getStr: function(ptr) {
  var ret = UTF8ToString(ptr);
  return ret;
 }
};

function _proc_exit(code) {
 EXITSTATUS = code;
 if (!keepRuntimeAlive()) {
  if (Module["onExit"]) Module["onExit"](code);
  ABORT = true;
 }
 quit_(code, new ExitStatus(code));
}

function exitJS(status, implicit) {
 EXITSTATUS = status;
 checkUnflushedContent();
 if (keepRuntimeAlive() && !implicit) {
  var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
  err(msg);
 }
 _proc_exit(status);
}

var _exit = exitJS;

function maybeExit() {
 if (!keepRuntimeAlive()) {
  try {
   _exit(EXITSTATUS);
  } catch (e) {
   handleException(e);
  }
 }
}

function callUserCallback(func) {
 if (ABORT) {
  err("user callback triggered after runtime exited or application aborted.  Ignoring.");
  return;
 }
 try {
  func();
  maybeExit();
 } catch (e) {
  handleException(e);
 }
}

function readI53FromU64(ptr) {
 return SAFE_HEAP_LOAD((ptr >> 2) * 4, 4, 1) + SAFE_HEAP_LOAD((ptr + 4 >> 2) * 4, 4, 1) * 4294967296;
}

function writeI53ToI64(ptr, num) {
 SAFE_HEAP_STORE((ptr >> 2) * 4, num, 4);
 SAFE_HEAP_STORE((ptr + 4 >> 2) * 4, (num - SAFE_HEAP_LOAD((ptr >> 2) * 4, 4, 1)) / 4294967296, 4);
 var deserialized = num >= 0 ? readI53FromU64(ptr) : readI53FromI64(ptr);
 if (deserialized != num) warnOnce("writeI53ToI64() out of range: serialized JS Number " + num + " to Wasm heap as bytes lo=" + ptrToString(SAFE_HEAP_LOAD((ptr >> 2) * 4, 4, 1)) + ", hi=" + ptrToString(SAFE_HEAP_LOAD((ptr + 4 >> 2) * 4, 4, 1)) + ", which deserializes back to " + deserialized + " instead!");
}

function fetchCacheData(db, fetch, data, onsuccess, onerror) {
 if (!db) {
  onerror(fetch, 0, "IndexedDB not available!");
  return;
 }
 var fetch_attr = fetch + 112;
 var destinationPath = SAFE_HEAP_LOAD((fetch_attr + 64 >> 2) * 4, 4, 1);
 if (!destinationPath) destinationPath = SAFE_HEAP_LOAD((fetch + 8 >> 2) * 4, 4, 1);
 var destinationPathStr = UTF8ToString(destinationPath);
 try {
  var transaction = db.transaction([ "FILES" ], "readwrite");
  var packages = transaction.objectStore("FILES");
  var putRequest = packages.put(data, destinationPathStr);
  putRequest.onsuccess = event => {
   SAFE_HEAP_STORE((fetch + 40 >> 1) * 2, 4, 2);
   SAFE_HEAP_STORE((fetch + 42 >> 1) * 2, 200, 2);
   stringToUTF8("OK", fetch + 44, 64);
   onsuccess(fetch, 0, destinationPathStr);
  };
  putRequest.onerror = error => {
   SAFE_HEAP_STORE((fetch + 40 >> 1) * 2, 4, 2);
   SAFE_HEAP_STORE((fetch + 42 >> 1) * 2, 413, 2);
   stringToUTF8("Payload Too Large", fetch + 44, 64);
   onerror(fetch, 0, error);
  };
 } catch (e) {
  onerror(fetch, 0, e);
 }
}

function fetchLoadCachedData(db, fetch, onsuccess, onerror) {
 if (!db) {
  onerror(fetch, 0, "IndexedDB not available!");
  return;
 }
 var fetch_attr = fetch + 112;
 var path = SAFE_HEAP_LOAD((fetch_attr + 64 >> 2) * 4, 4, 1);
 if (!path) path = SAFE_HEAP_LOAD((fetch + 8 >> 2) * 4, 4, 1);
 var pathStr = UTF8ToString(path);
 try {
  var transaction = db.transaction([ "FILES" ], "readonly");
  var packages = transaction.objectStore("FILES");
  var getRequest = packages.get(pathStr);
  getRequest.onsuccess = event => {
   if (event.target.result) {
    var value = event.target.result;
    var len = value.byteLength || value.length;
    var ptr = _malloc(len);
    HEAPU8.set(new Uint8Array(value), ptr);
    SAFE_HEAP_STORE((fetch + 12 >> 2) * 4, ptr, 4);
    writeI53ToI64(fetch + 16, len);
    writeI53ToI64(fetch + 24, 0);
    writeI53ToI64(fetch + 32, len);
    SAFE_HEAP_STORE((fetch + 40 >> 1) * 2, 4, 2);
    SAFE_HEAP_STORE((fetch + 42 >> 1) * 2, 200, 2);
    stringToUTF8("OK", fetch + 44, 64);
    onsuccess(fetch, 0, value);
   } else {
    SAFE_HEAP_STORE((fetch + 40 >> 1) * 2, 4, 2);
    SAFE_HEAP_STORE((fetch + 42 >> 1) * 2, 404, 2);
    stringToUTF8("Not Found", fetch + 44, 64);
    onerror(fetch, 0, "no data");
   }
  };
  getRequest.onerror = error => {
   SAFE_HEAP_STORE((fetch + 40 >> 1) * 2, 4, 2);
   SAFE_HEAP_STORE((fetch + 42 >> 1) * 2, 404, 2);
   stringToUTF8("Not Found", fetch + 44, 64);
   onerror(fetch, 0, error);
  };
 } catch (e) {
  onerror(fetch, 0, e);
 }
}

function fetchDeleteCachedData(db, fetch, onsuccess, onerror) {
 if (!db) {
  onerror(fetch, 0, "IndexedDB not available!");
  return;
 }
 var fetch_attr = fetch + 112;
 var path = SAFE_HEAP_LOAD((fetch_attr + 64 >> 2) * 4, 4, 1);
 if (!path) path = SAFE_HEAP_LOAD((fetch + 8 >> 2) * 4, 4, 1);
 var pathStr = UTF8ToString(path);
 try {
  var transaction = db.transaction([ "FILES" ], "readwrite");
  var packages = transaction.objectStore("FILES");
  var request = packages.delete(pathStr);
  request.onsuccess = event => {
   var value = event.target.result;
   SAFE_HEAP_STORE((fetch + 12 >> 2) * 4, 0, 4);
   writeI53ToI64(fetch + 16, 0);
   writeI53ToI64(fetch + 24, 0);
   writeI53ToI64(fetch + 32, 0);
   SAFE_HEAP_STORE((fetch + 40 >> 1) * 2, 4, 2);
   SAFE_HEAP_STORE((fetch + 42 >> 1) * 2, 200, 2);
   stringToUTF8("OK", fetch + 44, 64);
   onsuccess(fetch, 0, value);
  };
  request.onerror = error => {
   SAFE_HEAP_STORE((fetch + 40 >> 1) * 2, 4, 2);
   SAFE_HEAP_STORE((fetch + 42 >> 1) * 2, 404, 2);
   stringToUTF8("Not Found", fetch + 44, 64);
   onerror(fetch, 0, error);
  };
 } catch (e) {
  onerror(fetch, 0, e);
 }
}

var wasmTableMirror = [];

function getWasmTableEntry(funcPtr) {
 var func = wasmTableMirror[funcPtr];
 if (!func) {
  if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
  wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
 }
 assert(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
 return func;
}

function _emscripten_start_fetch(fetch, successcb, errorcb, progresscb, readystatechangecb) {
 var fetch_attr = fetch + 112;
 var requestMethod = UTF8ToString(fetch_attr);
 var onsuccess = SAFE_HEAP_LOAD((fetch_attr + 36 >> 2) * 4, 4, 1);
 var onerror = SAFE_HEAP_LOAD((fetch_attr + 40 >> 2) * 4, 4, 1);
 var onprogress = SAFE_HEAP_LOAD((fetch_attr + 44 >> 2) * 4, 4, 1);
 var onreadystatechange = SAFE_HEAP_LOAD((fetch_attr + 48 >> 2) * 4, 4, 1);
 var fetchAttributes = SAFE_HEAP_LOAD((fetch_attr + 52 >> 2) * 4, 4, 1);
 var fetchAttrLoadToMemory = !!(fetchAttributes & 1);
 var fetchAttrStreamData = !!(fetchAttributes & 2);
 var fetchAttrPersistFile = !!(fetchAttributes & 4);
 var fetchAttrNoDownload = !!(fetchAttributes & 32);
 var fetchAttrAppend = !!(fetchAttributes & 8);
 var fetchAttrReplace = !!(fetchAttributes & 16);
 var fetchAttrSynchronous = !!(fetchAttributes & 64);
 function doCallback(f) {
  if (fetchAttrSynchronous) {
   f();
  } else {
   callUserCallback(f);
  }
 }
 var reportSuccess = (fetch, xhr, e) => {
  doCallback(() => {
   if (onsuccess) getWasmTableEntry(onsuccess)(fetch); else if (successcb) successcb(fetch);
  });
 };
 var reportProgress = (fetch, xhr, e) => {
  doCallback(() => {
   if (onprogress) getWasmTableEntry(onprogress)(fetch); else if (progresscb) progresscb(fetch);
  });
 };
 var reportError = (fetch, xhr, e) => {
  doCallback(() => {
   if (onerror) getWasmTableEntry(onerror)(fetch); else if (errorcb) errorcb(fetch);
  });
 };
 var reportReadyStateChange = (fetch, xhr, e) => {
  doCallback(() => {
   if (onreadystatechange) getWasmTableEntry(onreadystatechange)(fetch); else if (readystatechangecb) readystatechangecb(fetch);
  });
 };
 var performUncachedXhr = (fetch, xhr, e) => {
  fetchXHR(fetch, reportSuccess, reportError, reportProgress, reportReadyStateChange);
 };
 var cacheResultAndReportSuccess = (fetch, xhr, e) => {
  var storeSuccess = (fetch, xhr, e) => {
   doCallback(() => {
    if (onsuccess) getWasmTableEntry(onsuccess)(fetch); else if (successcb) successcb(fetch);
   });
  };
  var storeError = (fetch, xhr, e) => {
   doCallback(() => {
    if (onsuccess) getWasmTableEntry(onsuccess)(fetch); else if (successcb) successcb(fetch);
   });
  };
  fetchCacheData(Fetch.dbInstance, fetch, xhr.response, storeSuccess, storeError);
 };
 var performCachedXhr = (fetch, xhr, e) => {
  fetchXHR(fetch, cacheResultAndReportSuccess, reportError, reportProgress, reportReadyStateChange);
 };
 if (requestMethod === "EM_IDB_STORE") {
  var ptr = SAFE_HEAP_LOAD((fetch_attr + 84 >> 2) * 4, 4, 1);
  fetchCacheData(Fetch.dbInstance, fetch, HEAPU8.slice(ptr, ptr + SAFE_HEAP_LOAD((fetch_attr + 88 >> 2) * 4, 4, 1)), reportSuccess, reportError);
 } else if (requestMethod === "EM_IDB_DELETE") {
  fetchDeleteCachedData(Fetch.dbInstance, fetch, reportSuccess, reportError);
 } else if (!fetchAttrReplace) {
  fetchLoadCachedData(Fetch.dbInstance, fetch, reportSuccess, fetchAttrNoDownload ? reportError : fetchAttrPersistFile ? performCachedXhr : performUncachedXhr);
 } else if (!fetchAttrNoDownload) {
  fetchXHR(fetch, fetchAttrPersistFile ? cacheResultAndReportSuccess : reportSuccess, reportError, reportProgress, reportReadyStateChange);
 } else {
  return 0;
 }
 return fetch;
}

function _fd_close(fd) {
 abort("fd_close called without SYSCALLS_REQUIRE_FILESYSTEM");
}

function convertI32PairToI53Checked(lo, hi) {
 assert(lo == lo >>> 0 || lo == (lo | 0));
 assert(hi === (hi | 0));
 return hi + 2097152 >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
}

function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
 return 70;
}

var printCharBuffers = [ null, [], [] ];

function printChar(stream, curr) {
 var buffer = printCharBuffers[stream];
 assert(buffer);
 if (curr === 0 || curr === 10) {
  (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
  buffer.length = 0;
 } else {
  buffer.push(curr);
 }
}

function flush_NO_FILESYSTEM() {
 _fflush(0);
 if (printCharBuffers[1].length) printChar(1, 10);
 if (printCharBuffers[2].length) printChar(2, 10);
}

function _fd_write(fd, iov, iovcnt, pnum) {
 var num = 0;
 for (var i = 0; i < iovcnt; i++) {
  var ptr = SAFE_HEAP_LOAD((iov >> 2) * 4, 4, 1);
  var len = SAFE_HEAP_LOAD((iov + 4 >> 2) * 4, 4, 1);
  iov += 8;
  for (var j = 0; j < len; j++) {
   printChar(fd, SAFE_HEAP_LOAD(ptr + j, 1, 1));
  }
  num += len;
 }
 SAFE_HEAP_STORE((pnum >> 2) * 4, num, 4);
 checkInt32(num);
 return 0;
}

function arraySum(array, index) {
 var sum = 0;
 for (var i = 0; i <= index; sum += array[i++]) {}
 return sum;
}

var MONTH_DAYS_LEAP = [ 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

var MONTH_DAYS_REGULAR = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

function addDays(date, days) {
 var newDate = new Date(date.getTime());
 while (days > 0) {
  var leap = isLeapYear(newDate.getFullYear());
  var currentMonth = newDate.getMonth();
  var daysInCurrentMonth = (leap ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[currentMonth];
  if (days > daysInCurrentMonth - newDate.getDate()) {
   days -= daysInCurrentMonth - newDate.getDate() + 1;
   newDate.setDate(1);
   if (currentMonth < 11) {
    newDate.setMonth(currentMonth + 1);
   } else {
    newDate.setMonth(0);
    newDate.setFullYear(newDate.getFullYear() + 1);
   }
  } else {
   newDate.setDate(newDate.getDate() + days);
   return newDate;
  }
 }
 return newDate;
}

function intArrayFromString(stringy, dontAddNull, length) {
 var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
 var u8array = new Array(len);
 var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
 if (dontAddNull) u8array.length = numBytesWritten;
 return u8array;
}

function writeArrayToMemory(array, buffer) {
 assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
 HEAP8.set(array, buffer);
}

function _strftime(s, maxsize, format, tm) {
 var tm_zone = SAFE_HEAP_LOAD((tm + 40 >> 2) * 4, 4, 0);
 var date = {
  tm_sec: SAFE_HEAP_LOAD((tm >> 2) * 4, 4, 0),
  tm_min: SAFE_HEAP_LOAD((tm + 4 >> 2) * 4, 4, 0),
  tm_hour: SAFE_HEAP_LOAD((tm + 8 >> 2) * 4, 4, 0),
  tm_mday: SAFE_HEAP_LOAD((tm + 12 >> 2) * 4, 4, 0),
  tm_mon: SAFE_HEAP_LOAD((tm + 16 >> 2) * 4, 4, 0),
  tm_year: SAFE_HEAP_LOAD((tm + 20 >> 2) * 4, 4, 0),
  tm_wday: SAFE_HEAP_LOAD((tm + 24 >> 2) * 4, 4, 0),
  tm_yday: SAFE_HEAP_LOAD((tm + 28 >> 2) * 4, 4, 0),
  tm_isdst: SAFE_HEAP_LOAD((tm + 32 >> 2) * 4, 4, 0),
  tm_gmtoff: SAFE_HEAP_LOAD((tm + 36 >> 2) * 4, 4, 0),
  tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
 };
 var pattern = UTF8ToString(format);
 var EXPANSION_RULES_1 = {
  "%c": "%a %b %d %H:%M:%S %Y",
  "%D": "%m/%d/%y",
  "%F": "%Y-%m-%d",
  "%h": "%b",
  "%r": "%I:%M:%S %p",
  "%R": "%H:%M",
  "%T": "%H:%M:%S",
  "%x": "%m/%d/%y",
  "%X": "%H:%M:%S",
  "%Ec": "%c",
  "%EC": "%C",
  "%Ex": "%m/%d/%y",
  "%EX": "%H:%M:%S",
  "%Ey": "%y",
  "%EY": "%Y",
  "%Od": "%d",
  "%Oe": "%e",
  "%OH": "%H",
  "%OI": "%I",
  "%Om": "%m",
  "%OM": "%M",
  "%OS": "%S",
  "%Ou": "%u",
  "%OU": "%U",
  "%OV": "%V",
  "%Ow": "%w",
  "%OW": "%W",
  "%Oy": "%y"
 };
 for (var rule in EXPANSION_RULES_1) {
  pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
 }
 var WEEKDAYS = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
 var MONTHS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
 function leadingSomething(value, digits, character) {
  var str = typeof value == "number" ? value.toString() : value || "";
  while (str.length < digits) {
   str = character[0] + str;
  }
  return str;
 }
 function leadingNulls(value, digits) {
  return leadingSomething(value, digits, "0");
 }
 function compareByDay(date1, date2) {
  function sgn(value) {
   return value < 0 ? -1 : value > 0 ? 1 : 0;
  }
  var compare;
  if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
   if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
    compare = sgn(date1.getDate() - date2.getDate());
   }
  }
  return compare;
 }
 function getFirstWeekStartDate(janFourth) {
  switch (janFourth.getDay()) {
  case 0:
   return new Date(janFourth.getFullYear() - 1, 11, 29);

  case 1:
   return janFourth;

  case 2:
   return new Date(janFourth.getFullYear(), 0, 3);

  case 3:
   return new Date(janFourth.getFullYear(), 0, 2);

  case 4:
   return new Date(janFourth.getFullYear(), 0, 1);

  case 5:
   return new Date(janFourth.getFullYear() - 1, 11, 31);

  case 6:
   return new Date(janFourth.getFullYear() - 1, 11, 30);
  }
 }
 function getWeekBasedYear(date) {
  var thisDate = addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
  var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
  var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
  var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
  var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
   if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
    return thisDate.getFullYear() + 1;
   }
   return thisDate.getFullYear();
  }
  return thisDate.getFullYear() - 1;
 }
 var EXPANSION_RULES_2 = {
  "%a": function(date) {
   return WEEKDAYS[date.tm_wday].substring(0, 3);
  },
  "%A": function(date) {
   return WEEKDAYS[date.tm_wday];
  },
  "%b": function(date) {
   return MONTHS[date.tm_mon].substring(0, 3);
  },
  "%B": function(date) {
   return MONTHS[date.tm_mon];
  },
  "%C": function(date) {
   var year = date.tm_year + 1900;
   return leadingNulls(year / 100 | 0, 2);
  },
  "%d": function(date) {
   return leadingNulls(date.tm_mday, 2);
  },
  "%e": function(date) {
   return leadingSomething(date.tm_mday, 2, " ");
  },
  "%g": function(date) {
   return getWeekBasedYear(date).toString().substring(2);
  },
  "%G": function(date) {
   return getWeekBasedYear(date);
  },
  "%H": function(date) {
   return leadingNulls(date.tm_hour, 2);
  },
  "%I": function(date) {
   var twelveHour = date.tm_hour;
   if (twelveHour == 0) twelveHour = 12; else if (twelveHour > 12) twelveHour -= 12;
   return leadingNulls(twelveHour, 2);
  },
  "%j": function(date) {
   return leadingNulls(date.tm_mday + arraySum(isLeapYear(date.tm_year + 1900) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, date.tm_mon - 1), 3);
  },
  "%m": function(date) {
   return leadingNulls(date.tm_mon + 1, 2);
  },
  "%M": function(date) {
   return leadingNulls(date.tm_min, 2);
  },
  "%n": function() {
   return "\n";
  },
  "%p": function(date) {
   if (date.tm_hour >= 0 && date.tm_hour < 12) {
    return "AM";
   }
   return "PM";
  },
  "%S": function(date) {
   return leadingNulls(date.tm_sec, 2);
  },
  "%t": function() {
   return "\t";
  },
  "%u": function(date) {
   return date.tm_wday || 7;
  },
  "%U": function(date) {
   var days = date.tm_yday + 7 - date.tm_wday;
   return leadingNulls(Math.floor(days / 7), 2);
  },
  "%V": function(date) {
   var val = Math.floor((date.tm_yday + 7 - (date.tm_wday + 6) % 7) / 7);
   if ((date.tm_wday + 371 - date.tm_yday - 2) % 7 <= 2) {
    val++;
   }
   if (!val) {
    val = 52;
    var dec31 = (date.tm_wday + 7 - date.tm_yday - 1) % 7;
    if (dec31 == 4 || dec31 == 5 && isLeapYear(date.tm_year % 400 - 1)) {
     val++;
    }
   } else if (val == 53) {
    var jan1 = (date.tm_wday + 371 - date.tm_yday) % 7;
    if (jan1 != 4 && (jan1 != 3 || !isLeapYear(date.tm_year))) val = 1;
   }
   return leadingNulls(val, 2);
  },
  "%w": function(date) {
   return date.tm_wday;
  },
  "%W": function(date) {
   var days = date.tm_yday + 7 - (date.tm_wday + 6) % 7;
   return leadingNulls(Math.floor(days / 7), 2);
  },
  "%y": function(date) {
   return (date.tm_year + 1900).toString().substring(2);
  },
  "%Y": function(date) {
   return date.tm_year + 1900;
  },
  "%z": function(date) {
   var off = date.tm_gmtoff;
   var ahead = off >= 0;
   off = Math.abs(off) / 60;
   off = off / 60 * 100 + off % 60;
   return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
  },
  "%Z": function(date) {
   return date.tm_zone;
  },
  "%%": function() {
   return "%";
  }
 };
 pattern = pattern.replace(/%%/g, "\0\0");
 for (var rule in EXPANSION_RULES_2) {
  if (pattern.includes(rule)) {
   pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
  }
 }
 pattern = pattern.replace(/\0\0/g, "%");
 var bytes = intArrayFromString(pattern, false);
 if (bytes.length > maxsize) {
  return 0;
 }
 writeArrayToMemory(bytes, s);
 return bytes.length - 1;
}

function jstoi_q(str) {
 return parseInt(str);
}

function _strptime(buf, format, tm) {
 var pattern = UTF8ToString(format);
 var SPECIAL_CHARS = "\\!@#$^&*()+=-[]/{}|:<>?,.";
 for (var i = 0, ii = SPECIAL_CHARS.length; i < ii; ++i) {
  pattern = pattern.replace(new RegExp("\\" + SPECIAL_CHARS[i], "g"), "\\" + SPECIAL_CHARS[i]);
 }
 var EQUIVALENT_MATCHERS = {
  "%A": "%a",
  "%B": "%b",
  "%c": "%a %b %d %H:%M:%S %Y",
  "%D": "%m\\/%d\\/%y",
  "%e": "%d",
  "%F": "%Y-%m-%d",
  "%h": "%b",
  "%R": "%H\\:%M",
  "%r": "%I\\:%M\\:%S\\s%p",
  "%T": "%H\\:%M\\:%S",
  "%x": "%m\\/%d\\/(?:%y|%Y)",
  "%X": "%H\\:%M\\:%S"
 };
 for (var matcher in EQUIVALENT_MATCHERS) {
  pattern = pattern.replace(matcher, EQUIVALENT_MATCHERS[matcher]);
 }
 var DATE_PATTERNS = {
  "%a": "(?:Sun(?:day)?)|(?:Mon(?:day)?)|(?:Tue(?:sday)?)|(?:Wed(?:nesday)?)|(?:Thu(?:rsday)?)|(?:Fri(?:day)?)|(?:Sat(?:urday)?)",
  "%b": "(?:Jan(?:uary)?)|(?:Feb(?:ruary)?)|(?:Mar(?:ch)?)|(?:Apr(?:il)?)|May|(?:Jun(?:e)?)|(?:Jul(?:y)?)|(?:Aug(?:ust)?)|(?:Sep(?:tember)?)|(?:Oct(?:ober)?)|(?:Nov(?:ember)?)|(?:Dec(?:ember)?)",
  "%C": "\\d\\d",
  "%d": "0[1-9]|[1-9](?!\\d)|1\\d|2\\d|30|31",
  "%H": "\\d(?!\\d)|[0,1]\\d|20|21|22|23",
  "%I": "\\d(?!\\d)|0\\d|10|11|12",
  "%j": "00[1-9]|0?[1-9](?!\\d)|0?[1-9]\\d(?!\\d)|[1,2]\\d\\d|3[0-6]\\d",
  "%m": "0[1-9]|[1-9](?!\\d)|10|11|12",
  "%M": "0\\d|\\d(?!\\d)|[1-5]\\d",
  "%n": "\\s",
  "%p": "AM|am|PM|pm|A\\.M\\.|a\\.m\\.|P\\.M\\.|p\\.m\\.",
  "%S": "0\\d|\\d(?!\\d)|[1-5]\\d|60",
  "%U": "0\\d|\\d(?!\\d)|[1-4]\\d|50|51|52|53",
  "%W": "0\\d|\\d(?!\\d)|[1-4]\\d|50|51|52|53",
  "%w": "[0-6]",
  "%y": "\\d\\d",
  "%Y": "\\d\\d\\d\\d",
  "%%": "%",
  "%t": "\\s"
 };
 var MONTH_NUMBERS = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11
 };
 var DAY_NUMBERS_SUN_FIRST = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6
 };
 var DAY_NUMBERS_MON_FIRST = {
  MON: 0,
  TUE: 1,
  WED: 2,
  THU: 3,
  FRI: 4,
  SAT: 5,
  SUN: 6
 };
 for (var datePattern in DATE_PATTERNS) {
  pattern = pattern.replace(datePattern, "(" + datePattern + DATE_PATTERNS[datePattern] + ")");
 }
 var capture = [];
 for (var i = pattern.indexOf("%"); i >= 0; i = pattern.indexOf("%")) {
  capture.push(pattern[i + 1]);
  pattern = pattern.replace(new RegExp("\\%" + pattern[i + 1], "g"), "");
 }
 var matches = new RegExp("^" + pattern, "i").exec(UTF8ToString(buf));
 function initDate() {
  function fixup(value, min, max) {
   return typeof value != "number" || isNaN(value) ? min : value >= min ? value <= max ? value : max : min;
  }
  return {
   year: fixup(SAFE_HEAP_LOAD((tm + 20 >> 2) * 4, 4, 0) + 1900, 1970, 9999),
   month: fixup(SAFE_HEAP_LOAD((tm + 16 >> 2) * 4, 4, 0), 0, 11),
   day: fixup(SAFE_HEAP_LOAD((tm + 12 >> 2) * 4, 4, 0), 1, 31),
   hour: fixup(SAFE_HEAP_LOAD((tm + 8 >> 2) * 4, 4, 0), 0, 23),
   min: fixup(SAFE_HEAP_LOAD((tm + 4 >> 2) * 4, 4, 0), 0, 59),
   sec: fixup(SAFE_HEAP_LOAD((tm >> 2) * 4, 4, 0), 0, 59)
  };
 }
 if (matches) {
  var date = initDate();
  var value;
  var getMatch = symbol => {
   var pos = capture.indexOf(symbol);
   if (pos >= 0) {
    return matches[pos + 1];
   }
   return;
  };
  if (value = getMatch("S")) {
   date.sec = jstoi_q(value);
  }
  if (value = getMatch("M")) {
   date.min = jstoi_q(value);
  }
  if (value = getMatch("H")) {
   date.hour = jstoi_q(value);
  } else if (value = getMatch("I")) {
   var hour = jstoi_q(value);
   if (value = getMatch("p")) {
    hour += value.toUpperCase()[0] === "P" ? 12 : 0;
   }
   date.hour = hour;
  }
  if (value = getMatch("Y")) {
   date.year = jstoi_q(value);
  } else if (value = getMatch("y")) {
   var year = jstoi_q(value);
   if (value = getMatch("C")) {
    year += jstoi_q(value) * 100;
   } else {
    year += year < 69 ? 2e3 : 1900;
   }
   date.year = year;
  }
  if (value = getMatch("m")) {
   date.month = jstoi_q(value) - 1;
  } else if (value = getMatch("b")) {
   date.month = MONTH_NUMBERS[value.substring(0, 3).toUpperCase()] || 0;
  }
  if (value = getMatch("d")) {
   date.day = jstoi_q(value);
  } else if (value = getMatch("j")) {
   var day = jstoi_q(value);
   var leapYear = isLeapYear(date.year);
   for (var month = 0; month < 12; ++month) {
    var daysUntilMonth = arraySum(leapYear ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, month - 1);
    if (day <= daysUntilMonth + (leapYear ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[month]) {
     date.day = day - daysUntilMonth;
    }
   }
  } else if (value = getMatch("a")) {
   var weekDay = value.substring(0, 3).toUpperCase();
   if (value = getMatch("U")) {
    var weekDayNumber = DAY_NUMBERS_SUN_FIRST[weekDay];
    var weekNumber = jstoi_q(value);
    var janFirst = new Date(date.year, 0, 1);
    var endDate;
    if (janFirst.getDay() === 0) {
     endDate = addDays(janFirst, weekDayNumber + 7 * (weekNumber - 1));
    } else {
     endDate = addDays(janFirst, 7 - janFirst.getDay() + weekDayNumber + 7 * (weekNumber - 1));
    }
    date.day = endDate.getDate();
    date.month = endDate.getMonth();
   } else if (value = getMatch("W")) {
    var weekDayNumber = DAY_NUMBERS_MON_FIRST[weekDay];
    var weekNumber = jstoi_q(value);
    var janFirst = new Date(date.year, 0, 1);
    var endDate;
    if (janFirst.getDay() === 1) {
     endDate = addDays(janFirst, weekDayNumber + 7 * (weekNumber - 1));
    } else {
     endDate = addDays(janFirst, 7 - janFirst.getDay() + 1 + weekDayNumber + 7 * (weekNumber - 1));
    }
    date.day = endDate.getDate();
    date.month = endDate.getMonth();
   }
  }
  var fullDate = new Date(date.year, date.month, date.day, date.hour, date.min, date.sec, 0);
  SAFE_HEAP_STORE((tm >> 2) * 4, fullDate.getSeconds(), 4);
  checkInt32(fullDate.getSeconds());
  SAFE_HEAP_STORE((tm + 4 >> 2) * 4, fullDate.getMinutes(), 4);
  checkInt32(fullDate.getMinutes());
  SAFE_HEAP_STORE((tm + 8 >> 2) * 4, fullDate.getHours(), 4);
  checkInt32(fullDate.getHours());
  SAFE_HEAP_STORE((tm + 12 >> 2) * 4, fullDate.getDate(), 4);
  checkInt32(fullDate.getDate());
  SAFE_HEAP_STORE((tm + 16 >> 2) * 4, fullDate.getMonth(), 4);
  checkInt32(fullDate.getMonth());
  SAFE_HEAP_STORE((tm + 20 >> 2) * 4, fullDate.getFullYear() - 1900, 4);
  checkInt32(fullDate.getFullYear() - 1900);
  SAFE_HEAP_STORE((tm + 24 >> 2) * 4, fullDate.getDay(), 4);
  checkInt32(fullDate.getDay());
  SAFE_HEAP_STORE((tm + 28 >> 2) * 4, arraySum(isLeapYear(fullDate.getFullYear()) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, fullDate.getMonth() - 1) + fullDate.getDate() - 1, 4);
  checkInt32(arraySum(isLeapYear(fullDate.getFullYear()) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, fullDate.getMonth() - 1) + fullDate.getDate() - 1);
  SAFE_HEAP_STORE((tm + 32 >> 2) * 4, 0, 4);
  checkInt32(0);
  return buf + intArrayFromString(matches[0]).length - 1;
 }
 return 0;
}

function getCFunc(ident) {
 var func = Module["_" + ident];
 assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
 return func;
}

function stringToUTF8OnStack(str) {
 var size = lengthBytesUTF8(str) + 1;
 var ret = stackAlloc(size);
 stringToUTF8(str, ret, size);
 return ret;
}

function ccall(ident, returnType, argTypes, args, opts) {
 var toC = {
  "string": str => {
   var ret = 0;
   if (str !== null && str !== undefined && str !== 0) {
    ret = stringToUTF8OnStack(str);
   }
   return ret;
  },
  "array": arr => {
   var ret = stackAlloc(arr.length);
   writeArrayToMemory(arr, ret);
   return ret;
  }
 };
 function convertReturnValue(ret) {
  if (returnType === "string") {
   return UTF8ToString(ret);
  }
  if (returnType === "boolean") return Boolean(ret);
  return ret;
 }
 var func = getCFunc(ident);
 var cArgs = [];
 var stack = 0;
 assert(returnType !== "array", 'Return type should not be "array".');
 if (args) {
  for (var i = 0; i < args.length; i++) {
   var converter = toC[argTypes[i]];
   if (converter) {
    if (stack === 0) stack = stackSave();
    cArgs[i] = converter(args[i]);
   } else {
    cArgs[i] = args[i];
   }
  }
 }
 var ret = func.apply(null, cArgs);
 function onDone(ret) {
  if (stack !== 0) stackRestore(stack);
  return convertReturnValue(ret);
 }
 ret = onDone(ret);
 return ret;
}

function cwrap(ident, returnType, argTypes, opts) {
 return function() {
  return ccall(ident, returnType, argTypes, arguments, opts);
 };
}

Fetch.staticInit();

function checkIncomingModuleAPI() {
 ignoredModuleProp("fetchSettings");
}

var wasmImports = {
 "__cxa_throw": ___cxa_throw,
 "__handle_stack_overflow": ___handle_stack_overflow,
 "_emscripten_fetch_free": __emscripten_fetch_free,
 "_emscripten_throw_longjmp": __emscripten_throw_longjmp,
 "_gmtime_js": __gmtime_js,
 "_localtime_js": __localtime_js,
 "_mktime_js": __mktime_js,
 "_tzset_js": __tzset_js,
 "abort": _abort,
 "alignfault": alignfault,
 "emscripten_date_now": _emscripten_date_now,
 "emscripten_is_main_browser_thread": _emscripten_is_main_browser_thread,
 "emscripten_memcpy_big": _emscripten_memcpy_big,
 "emscripten_resize_heap": _emscripten_resize_heap,
 "emscripten_start_fetch": _emscripten_start_fetch,
 "fd_close": _fd_close,
 "fd_seek": _fd_seek,
 "fd_write": _fd_write,
 "invoke_iii": invoke_iii,
 "invoke_iiii": invoke_iiii,
 "invoke_vi": invoke_vi,
 "invoke_vii": invoke_vii,
 "invoke_viii": invoke_viii,
 "invoke_viiii": invoke_viiii,
 "invoke_viiiii": invoke_viiiii,
 "segfault": segfault,
 "strftime": _strftime,
 "strptime": _strptime
};

var asm = createWasm();

var ___wasm_call_ctors = createExportWrapper("__wasm_call_ctors");

var _malloc = createExportWrapper("malloc");

var _free = createExportWrapper("free");

var _main = Module["_main"] = createExportWrapper("main");

var ___errno_location = createExportWrapper("__errno_location");

var _fflush = Module["_fflush"] = createExportWrapper("fflush");

var _emscripten_get_sbrk_ptr = createExportWrapper("emscripten_get_sbrk_ptr");

var _sbrk = createExportWrapper("sbrk");

var _setThrew = createExportWrapper("setThrew");

var _emscripten_stack_init = function() {
 return (_emscripten_stack_init = Module["asm"]["emscripten_stack_init"]).apply(null, arguments);
};

var _emscripten_stack_get_free = function() {
 return (_emscripten_stack_get_free = Module["asm"]["emscripten_stack_get_free"]).apply(null, arguments);
};

var _emscripten_stack_get_base = function() {
 return (_emscripten_stack_get_base = Module["asm"]["emscripten_stack_get_base"]).apply(null, arguments);
};

var _emscripten_stack_get_end = function() {
 return (_emscripten_stack_get_end = Module["asm"]["emscripten_stack_get_end"]).apply(null, arguments);
};

var stackSave = createExportWrapper("stackSave");

var stackRestore = createExportWrapper("stackRestore");

var stackAlloc = createExportWrapper("stackAlloc");

var _emscripten_stack_get_current = function() {
 return (_emscripten_stack_get_current = Module["asm"]["emscripten_stack_get_current"]).apply(null, arguments);
};

var ___cxa_is_pointer_type = createExportWrapper("__cxa_is_pointer_type");

var ___set_stack_limits = Module["___set_stack_limits"] = createExportWrapper("__set_stack_limits");

var dynCall_jiji = Module["dynCall_jiji"] = createExportWrapper("dynCall_jiji");

function invoke_vi(index, a1) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_vii(index, a1, a2) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiii(index, a1, a2, a3, a4) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iii(index, a1, a2) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viiiii(index, a1, a2, a3, a4, a5) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3, a4, a5);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_iiii(index, a1, a2, a3) {
 var sp = stackSave();
 try {
  return getWasmTableEntry(index)(a1, a2, a3);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

function invoke_viii(index, a1, a2, a3) {
 var sp = stackSave();
 try {
  getWasmTableEntry(index)(a1, a2, a3);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0) throw e;
  _setThrew(1, 0);
 }
}

Module["ccall"] = ccall;

Module["cwrap"] = cwrap;

var missingLibrarySymbols = [ "zeroMemory", "emscripten_realloc_buffer", "setErrNo", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "getHostByName", "initRandomFill", "randomFill", "traverseStack", "getCallstack", "emscriptenLog", "convertPCtoSourceLocation", "readEmAsmArgs", "jstoi_s", "getExecutableName", "listenOnce", "autoResumeAudioContext", "dynCallLegacy", "getDynCaller", "dynCall", "runtimeKeepalivePush", "runtimeKeepalivePop", "safeSetTimeout", "asmjsMangle", "asyncLoad", "alignMemory", "mmapAlloc", "HandleAllocator", "getNativeTypeSize", "STACK_SIZE", "STACK_ALIGN", "POINTER_SIZE", "ASSERTIONS", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "convertI32PairToI53", "convertU32PairToI53", "uleb128Encode", "sigToWasmTypes", "generateFuncType", "convertJsFunctionToWasm", "getEmptyTableSlot", "updateTableMap", "getFunctionAddress", "addFunction", "removeFunction", "reallyNegative", "strLen", "reSign", "formatString", "intArrayToString", "AsciiToString", "stringToAscii", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "getSocketFromFD", "getSocketAddress", "registerKeyEventCallback", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "demangle", "demangleAll", "jsStackTrace", "stackTrace", "getEnvStrings", "checkWasiClock", "wasiRightsToMuslOFlags", "wasiOFlagsToMuslOFlags", "createDyncallWrapper", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "getPromise", "makePromise", "idsToPromises", "makePromiseCallback", "setMainLoop", "FS_createPreloadedFile", "FS_modeStringToFlags", "FS_getMode", "_setNetworkCallback", "heapObjectForWebGLType", "heapAccessShiftForWebGLHeap", "webgl_enable_ANGLE_instanced_arrays", "webgl_enable_OES_vertex_array_object", "webgl_enable_WEBGL_draw_buffers", "webgl_enable_WEBGL_multi_draw", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "colorChannelsInGlTextureFormat", "emscriptenWebGLGetTexPixelData", "__glGenObject", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "__glGetActiveAttribOrUniform", "writeGLArray", "registerWebGlEventCallback", "runAndAbortIfError", "SDL_unicode", "SDL_ttfContext", "SDL_audio", "GLFW_Window", "ALLOC_NORMAL", "ALLOC_STACK", "allocate", "writeStringToMemory", "writeAsciiToMemory" ];

missingLibrarySymbols.forEach(missingLibrarySymbol);

var unexportedSymbols = [ "run", "addOnPreRun", "addOnInit", "addOnPreMain", "addOnExit", "addOnPostRun", "addRunDependency", "removeRunDependency", "FS_createFolder", "FS_createPath", "FS_createDataFile", "FS_createLazyFile", "FS_createLink", "FS_createDevice", "FS_unlink", "out", "err", "callMain", "abort", "keepRuntimeAlive", "wasmMemory", "stackAlloc", "stackSave", "stackRestore", "getTempRet0", "setTempRet0", "writeStackCookie", "checkStackCookie", "ptrToString", "exitJS", "getHeapMax", "abortOnCannotGrowMemory", "ENV", "MONTH_DAYS_REGULAR", "MONTH_DAYS_LEAP", "MONTH_DAYS_REGULAR_CUMULATIVE", "MONTH_DAYS_LEAP_CUMULATIVE", "isLeapYear", "ydayFromDate", "arraySum", "addDays", "ERRNO_CODES", "ERRNO_MESSAGES", "DNS", "Protocols", "Sockets", "timers", "warnOnce", "UNWIND_CACHE", "readEmAsmArgsArray", "jstoi_q", "handleException", "callUserCallback", "maybeExit", "writeI53ToI64", "readI53FromI64", "readI53FromU64", "convertI32PairToI53Checked", "getCFunc", "freeTableIndexes", "functionsInTableMap", "unSign", "setValue", "getValue", "PATH", "PATH_FS", "UTF8Decoder", "UTF8ArrayToString", "UTF8ToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "intArrayFromString", "UTF16Decoder", "stringToNewUTF8", "stringToUTF8OnStack", "writeArrayToMemory", "SYSCALLS", "JSEvents", "specialHTMLTargets", "currentFullscreenStrategy", "restoreOldWindowedStyle", "ExitStatus", "flush_NO_FILESYSTEM", "dlopenMissingError", "promiseMap", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "ExceptionInfo", "Browser", "wget", "preloadPlugins", "FS", "MEMFS", "TTY", "PIPEFS", "SOCKFS", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "miniTempWebGLIntBuffers", "GL", "emscripten_webgl_power_preferences", "AL", "GLUT", "EGL", "GLEW", "IDBStore", "SDL", "SDL_gfx", "GLFW", "allocateUTF8", "allocateUTF8OnStack", "Fetch", "fetchDeleteCachedData", "fetchLoadCachedData", "fetchCacheData", "fetchXHR" ];

unexportedSymbols.forEach(unexportedRuntimeSymbol);

var calledRun;

dependenciesFulfilled = function runCaller() {
 if (!calledRun) run();
 if (!calledRun) dependenciesFulfilled = runCaller;
};

function callMain() {
 assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
 assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
 var entryFunction = _main;
 var argc = 0;
 var argv = 0;
 try {
  var ret = entryFunction(argc, argv);
  exitJS(ret, true);
  return ret;
 } catch (e) {
  return handleException(e);
 }
}

function stackCheckInit() {
 _emscripten_stack_init();
 writeStackCookie();
}

function run() {
 if (runDependencies > 0) {
  return;
 }
 stackCheckInit();
 preRun();
 if (runDependencies > 0) {
  return;
 }
 function doRun() {
  if (calledRun) return;
  calledRun = true;
  Module["calledRun"] = true;
  if (ABORT) return;
  initRuntime();
  preMain();
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  if (shouldRunNow) callMain();
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout(function() {
   setTimeout(function() {
    Module["setStatus"]("");
   }, 1);
   doRun();
  }, 1);
 } else {
  doRun();
 }
 checkStackCookie();
}

function checkUnflushedContent() {
 var oldOut = out;
 var oldErr = err;
 var has = false;
 out = err = x => {
  has = true;
 };
 try {
  flush_NO_FILESYSTEM();
 } catch (e) {}
 out = oldOut;
 err = oldErr;
 if (has) {
  warnOnce("stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.");
  warnOnce("(this may also be due to not including full filesystem support - try building with -sFORCE_FILESYSTEM)");
 }
}

if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}

var shouldRunNow = true;

if (Module["noInitialRun"]) shouldRunNow = false;

run();
