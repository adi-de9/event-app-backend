import 'dotenv/config';
import { app } from './src/app.js';
import { SERVER_PORT } from './src/constant.js';

app.listen(SERVER_PORT, () =>
  console.log(`Server running on Port: ${SERVER_PORT}`)
);
