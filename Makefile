build_duktape_example_1:
	@echo "Building WASM duktape_example_1 ..."
	emcc -o ./public/duktape_example_1/duktape_example_1.html -I./engine/duktape -I./engine/emscripten -I./extension ./engine/duktape/duktape.c ./duktape_example_1.cc ./extension/native_print.cc ./extension/native_console.cc ./extension/native_fetch.cc -O1 --bind -s EXPORTED_RUNTIME_METHODS=["cwrap"] -s FETCH=1 -s EXPORTED_FUNCTIONS=['_runScript','_main'] -s ASSERTIONS

build_duktape_example_2:
	@echo "Building WASM build_duktape_example_2 ..."
	emcc -o ./public/duktape_example_2/duktape_example_2.html -I./engine/duktape -I./engine/emscripten -I./extension ./engine/duktape/duktape.c ./duktape_example_2.cc -lm -O1 -s NO_EXIT_RUNTIME=1 -s EXPORTED_FUNCTIONS='["_main"]' -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' -s FETCH=1 -s ASSERTIONS=2 -s SAFE_HEAP=1

build_duktape_example_2_gcc:
	@echo "Building WASM build_duktape_example_2_gcc ..."
	gcc -o ./public/duktape_example_2/duktape_example_2 -I./engine/duktape ./engine/duktape/duktape.c ./duktape_example_2.cc -lm

