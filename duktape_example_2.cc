#include <cstdio>
#include <vector>
#include "duktape.h"
#include "emscripten/fetch.h"

duk_context* g_ctx = nullptr;
std::vector<char> fetch_data;

void test() {
    printf("test\n");

    duk_require_function(g_ctx, 1);
    duk_push_string(g_ctx, "C++ Response: Hello from native_callback!");
    duk_call(g_ctx, 1);
    const char* response = duk_get_string(g_ctx, -1);
    printf("JavaScript Callback response: %s\n", response);
}

void on_fetch_success(emscripten_fetch_t* fetch) {
    printf("Finished downloading %llu bytes from URL %s.\n", fetch->numBytes, fetch->url);
    printf("status = %d (%s)\n", fetch->status, fetch->statusText);
    printf("Data received: %s\n", fetch->data);

    fetch_data = std::vector<char>(fetch->data, fetch->data + fetch->numBytes);
    fetch_data.push_back('\0');
    printf("native_fetch fetch_data on_fetch_success: %s\n", fetch_data.data());

    test();

    // 保存回调函数的引用
    // duk_require_function(g_ctx, 1);
    // duk_push_string(g_ctx, "C++ Response: Hello from native_callback!");
    // duk_call(g_ctx, 1);
    // const char* response = duk_get_string(g_ctx, -1);
    // printf("JavaScript Callback response: %s\n", response);

    // duk_push_string(g_ctx, "C++ Response: Hello from native_fetch!");
    // duk_call(g_ctx, 1);
    // const char* response = duk_get_string(g_ctx, -1);
    // printf("JavaScript Callback response: %s\n", response);

    // if (fetch->status == 200) {
    //     std::vector<char> data(fetch->data, fetch->data + fetch->numBytes);
    //     data.push_back('\0');
    //     printf("Data received: %s\n", data.data());

    // } else {
    //     printf("Error fetching URL, HTTP status %d\n", fetch->status);
    // }

    emscripten_fetch_close(fetch);
}

void on_fetch_error(emscripten_fetch_t* fetch) {
    printf("Error fetching URL %s\n", fetch->url);
    emscripten_fetch_close(fetch);
}

// console_log 函数，用于在控制台输出
static duk_ret_t console_log(duk_context* ctx) {
    const char* msg = duk_require_string(ctx, 0);
    printf("%s\n", msg);
    return 0;
}

// native_callback 函数，用于接收 JavaScript 代码传递过来的参数
static duk_ret_t native_callback(duk_context* ctx) {
    const char* args = duk_require_string(ctx, 0);
    printf("native_callback called with: %s\n", args);

    // 保存回调函数的引用
    duk_require_function(ctx, 1);

    duk_push_string(ctx, "C++ Response: Hello from native_callback!");
    duk_call(ctx, 1);
    const char* response = duk_get_string(ctx, -1);
    printf("JavaScript Callback response: %s\n", response);

    return 0;
}

// native_fetch 函数，用于发起网络请求
static duk_ret_t native_fetch(duk_context* ctx) {
    const char* url = duk_require_string(ctx, 0);
    printf("native_fetch called with: %s\n", url);

    emscripten_fetch_attr_t attr;
    emscripten_fetch_attr_init(&attr);
    strcpy(attr.requestMethod, "GET");

    attr.attributes = EMSCRIPTEN_FETCH_LOAD_TO_MEMORY;
    attr.onsuccess = on_fetch_success;  // 设置为静态函数
    attr.onerror = on_fetch_error;      // 设置为静态函数

    emscripten_fetch(&attr, url);

    return 0;
}

// 主函数，用于初始化 Duktape，注册 native_callback 函数
int main() {
    duk_context* ctx = duk_create_heap_default();
    if (!ctx) {
        printf("Failed to create a Duktape heap.\n");
        return 1;
    }

    g_ctx = ctx;  // 设置全局上下文指针

    duk_push_c_function(ctx, native_callback, 2);
    duk_put_global_string(ctx, "native_callback");

    duk_push_c_function(ctx, native_fetch, 2);
    duk_put_global_string(ctx, "native_fetch");

    duk_push_c_function(ctx, console_log, 1);
    duk_put_global_string(ctx, "console_log");

    const char* js_code_callback = "var args = 'test args'; native_callback(args, function (response) { console_log('js_code_callback response: ' + response); });";
    const char* js_code_fetch = "var args = 'http://localhost:8080/static/README.md'; native_fetch(args, function (response) { console_log('js_code_callback response: ' + response); });";

    if (duk_peval_string(ctx, js_code_fetch) != 0) {
        printf("Error: %s\n", duk_safe_to_string(ctx, -1));
        duk_destroy_heap(ctx);
        return 1;
    }

    duk_destroy_heap(ctx);
    return 0;
}