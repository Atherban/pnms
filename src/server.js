require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 4000;


(async ()=>{
    await connectDB();
    app.listen(PORT,()=>{
        console.log(`[server] running on http://localhost:${PORT}`)
    })
})().catch((err)=>{
    console.error(`[server] failed to start: `,err);
    process.exit(1);
})
