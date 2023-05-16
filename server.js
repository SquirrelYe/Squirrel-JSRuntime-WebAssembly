const express = require('express');

const app = express();

// 代理资源，设置请求头
app.use('/static', express.static('public', {
  setHeaders: (res, path, stat) => {
    res.set('x-timestamp', Date.now());
    res.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.set('Cross-Origin-Embedder-Policy', 'require-corp');
  }
}));

app.listen(8080, () => {
  console.log('Server listening on port 8080');
})
