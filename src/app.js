import { CORS_ORIGIN } from './constant.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { logDetails } from './middleware/logdetails.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// middlwares
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logDetails);

// Routes
import authRouter from './modules/auth/auth.routes.js';
// import userRouter from './modules/users/user.routes.js'; // Internal use
import eventRouter from './modules/events/event.routes.js';
import boothRequestRouter from './modules/boothRequests/boothRequest.routes.js';
import menuRouter from './modules/menu/menu.routes.js';
import orderRouter from './modules/orders/order.routes.js';

app.use('/api/auth', authRouter);
app.use('/api/events', eventRouter);
app.use('/api/booth-requests', boothRequestRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', orderRouter);

// Health check
app.get('/api/healthCheck', async (_, res) => {
  return res.status(200).json({ success: true, message: 'health check OK' });
});

// Global Error Handler
app.use(errorHandler);

export { app };
