#include <cstdio>
#include "duktape.h"

extern "C" {
// 从 JavaScript 调用的 native_console_log 函数
duk_ret_t native_console_log(duk_context* ctx) {
    int argsCount = duk_get_top(ctx);

    for (int i = 0; i < argsCount; ++i) {
        printf("%s", duk_safe_to_string(ctx, i));
        if (i < argsCount - 1) {
            printf(" ");
        }
    }
    printf("\n");

    return 0;
}

// 从 JavaScript 调用的 native_console_error 函数
duk_ret_t native_console_error(duk_context* ctx) {
    int argsCount = duk_get_top(ctx);

    fprintf(stderr, "Error: ");
    for (int i = 0; i < argsCount; ++i) {
        fprintf(stderr, "%s", duk_safe_to_string(ctx, i));
        if (i < argsCount - 1) {
            fprintf(stderr, " ");
        }
    }
    fprintf(stderr, "\n");

    return 0;
}
}