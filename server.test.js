const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

test('Server handles corrupt db.json gracefully', (t) => {
  const dbPath = path.join(__dirname, 'db.json');
  const historyPath = path.join(__dirname, 'history.json');

  const originalExistsSync = fs.existsSync;
  const originalReadFileSync = fs.readFileSync;
  const originalListen = http.Server.prototype.listen;
  const originalWriteFileSync = fs.writeFileSync;

  // Need to uncache server.js to require it cleanly
  delete require.cache[require.resolve('./server.js')];

  t.after(() => {
    fs.existsSync = originalExistsSync;
    fs.readFileSync = originalReadFileSync;
    http.Server.prototype.listen = originalListen;
    fs.writeFileSync = originalWriteFileSync;
  });

  fs.existsSync = (file) => {
    if (file === dbPath || file === historyPath) return true;
    return originalExistsSync(file);
  };

  fs.readFileSync = (file, encoding) => {
    if (file === dbPath || file === historyPath) return '{ invalid json';
    return originalReadFileSync(file, encoding);
  };

  fs.writeFileSync = (file, data, options) => {
    if (file === dbPath || file === historyPath) return; // Prevent actually modifying files on disk
    return originalWriteFileSync(file, data, options);
  };

  let listenCalled = false;
  http.Server.prototype.listen = function(...args) {
    listenCalled = true;
    // Don't actually listen, to avoid hanging the test process
    return this;
  };

  assert.doesNotThrow(() => {
    require('./server.js');
  }, 'Requiring server.js should not throw an error');

  assert.ok(listenCalled, 'Server.listen should have been called');
});
