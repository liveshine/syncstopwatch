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
