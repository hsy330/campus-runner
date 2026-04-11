import app from './app.js';
import { env } from './config/env.js';

const port = env.port;

app.listen(port, () => {
  console.log(`campus-runner-server listening on http://127.0.0.1:${port}`);
});
