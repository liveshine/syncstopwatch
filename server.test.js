const request = require('supertest');
const { app, server } = require('./server');

describe('Server Initialization & Static Files', () => {
  test('should serve static files (e.g., index.html) from the public directory', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    // Since express.static serves index.html by default for the root route,
    // we should see HTML in the response.
    expect(response.headers['content-type']).toMatch(/html/);
  });

  test('server should bind to a specified port successfully', (done) => {
    // We bind it to port 0 (OS assigns a random available port) to avoid conflicts
    server.listen(0, () => {
      const address = server.address();
      expect(address).not.toBeNull();
      expect(typeof address.port).toBe('number');
      server.close(done);
    });
  });
});
