#include <emscripten.h>

int main() {
	EM_ASM(console.log('你好，Emscripten！'); console.log(window.a););
	return 0;
}