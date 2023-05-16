#include <cstdio>
#include "duktape.h"

extern "C" {
// 要从 JavaScript 调用的 native_print 函数
duk_ret_t native_print(duk_context* ctx) {
    duk_push_string(ctx, " ");
    duk_insert(ctx, 0);
    duk_join(ctx, duk_get_top(ctx) - 1);

    printf("%s\n", duk_safe_to_string(ctx, -1));
    duk_pop(ctx);
    return 0;
}
}