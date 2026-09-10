import 'dotenv/config';
import app from './app';
import connectDB from './config/db';
import { initializePostgres } from './config/postgres';

const PORT = process.env.PORT ?? 5000;

const start = async () => {
  await connectDB();
  await initializePostgres();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
