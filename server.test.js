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

  assert.doesNotThrow(() => {
    const srv = require('./server.js');
    assert.ok(srv, 'Server should be exported');
  }, 'Requiring server.js should not throw an error');
});

const Client = require("socket.io-client");
const server = require("./server");

describe("Socket Events: start", () => {
  let clientSocket;
  let port;

  beforeAll((done) => {
    // Start server on an ephemeral port
    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    server.close(() => {
      done();
    });
  });

  beforeEach((done) => {
    clientSocket = new Client(`http://localhost:${port}?room=test_room_${Date.now()}`);
    clientSocket.on("connect", done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  it("should emit audio_cue with 'start' when start event is sent", (done) => {
    clientSocket.on("audio_cue", (arg) => {
      expect(arg).toBe("start");
      done();
    });

    clientSocket.emit("start");
  });
});
