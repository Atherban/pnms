require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await connectDB(); 

    app.listen(PORT, () => {
      console.log(`[server] Running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[server] Startup failed:', error.message);
    process.exit(1);
  }
})()


