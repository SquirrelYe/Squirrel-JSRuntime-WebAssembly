#include <emscripten.h>
#include <iostream>
#include "duktape.h"

// 插件清单，用于注册插件
extern "C" {
duk_ret_t native_print(duk_context* ctx);
duk_ret_t native_console_log(duk_context* ctx);
duk_ret_t native_console_error(duk_context* ctx);
duk_ret_t native_fetch(duk_context* ctx);
}

extern "C" {
// 接收 JavaScript 代码并执行它的 runScript 函数
EMSCRIPTEN_KEEPALIVE void runScript(const char* code) {
    duk_context* ctx = duk_create_heap_default();
    if (!ctx) {
        printf("Failed to create a Duktape heap.\n");
        return;
    }

    duk_push_c_function(ctx, native_print, DUK_VARARGS);
    duk_put_global_string(ctx, "duk_native_print");

    duk_push_c_function(ctx, native_console_log, DUK_VARARGS);
    duk_put_global_string(ctx, "duk_native_console_log");

    duk_push_c_function(ctx, native_console_error, DUK_VARARGS);
    duk_put_global_string(ctx, "duk_native_console_error");

    duk_push_c_function(ctx, native_fetch, 1);
    duk_put_global_string(ctx, "duk_native_fetch");

    duk_eval_string_noresult(ctx, "console = { log: duk_native_console_log, error: duk_native_console_error };");
    duk_eval_string_noresult(ctx, "print = duk_native_print;");

    if (duk_peval_string(ctx, code) != 0) {
        printf("JavaScript error: %s\n", duk_safe_to_string(ctx, -1));
        duk_destroy_heap(ctx);
        return;
    }

    duk_destroy_heap(ctx);
}

// 主函数，用于初始化 Duktape，注册 runScript 函数
int main() {
    EM_ASM("console.log('wasm js runtime is ready!')");
    EM_ASM("window.runScript = Module.cwrap('runScript', 'string', ['string'])");

    return 0;
}
}