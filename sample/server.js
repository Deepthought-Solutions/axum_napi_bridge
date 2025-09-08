const http = require('http');
const { handleRequest } = require('./index.node');

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);

  const headers = [];
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    headers.push([req.rawHeaders[i], req.rawHeaders[i + 1]]);
  }

  try {
    const responseJson = await handleRequest(req.method, req.url, headers, body.length > 0 ? body : null);
    const response = JSON.parse(responseJson);

    res.statusCode = response.status;
    for (const [key, value] of response.headers) {
        if (key.toLowerCase() !== 'content-length') {
            res.setHeader(key, value);
        }
    }
    res.end(response.body);
  } catch (e) {
    console.error('Error handling request:', e);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
