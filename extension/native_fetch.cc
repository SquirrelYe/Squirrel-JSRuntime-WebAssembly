#include <emscripten.h>
#include <emscripten/fetch.h>
#include "duktape.h"

extern "C" {

duk_ret_t native_fetch(duk_context* ctx) {
    const char* url = duk_require_string(ctx, 0);

    // 保存回调函数的引用
    duk_require_function(ctx, 1);
    duk_push_global_stash(ctx);
    duk_dup(ctx, 1);
    duk_put_prop_string(ctx, -2, "callbackFunction");

    emscripten_fetch_attr_t attr;
    emscripten_fetch_attr_init(&attr);
    strcpy(attr.requestMethod, "GET");

    attr.attributes = EMSCRIPTEN_FETCH_LOAD_TO_MEMORY;
    attr.onsuccess = [](emscripten_fetch_t* fetch) {
        printf("Finished downloading %llu bytes from URL %s.\n", fetch->numBytes, fetch->url);
        printf("status = %d (%s)\n", fetch->status, fetch->statusText);

        if (fetch->status == 200) {
            duk_context* ctx = duk_create_heap_default();
            if (!ctx) {
                printf("Failed to create a Duktape heap.\n");
                return;
            }

            // 调用 JavaScript 回调，并将响应字符串作为参数
            duk_push_persistent(ctx, 1);  // 之前我们在索引 1 位置持久化了回调函数
            duk_push_string(ctx, (const char*)fetch->data);
            duk_call(ctx, 1);  // 调用回调，传入 1 个参数

            duk_destroy_heap(ctx);
            emscripten_fetch_close(fetch);
        } else {
            printf("Error fetching URL, HTTP status %d\n", fetch->status);
        }
    };
    attr.onerror = [](emscripten_fetch_t* fetch) {
        printf("Error fetching URL %s\n", fetch->url);
        emscripten_fetch_close(fetch);
    };

    emscripten_fetch(&attr, url);

    return 1;
}
}