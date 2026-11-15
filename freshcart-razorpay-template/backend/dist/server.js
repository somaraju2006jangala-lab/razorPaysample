import { app } from './app.js';
import { config } from './config/index.js';
import { initDatabase } from './database/db.js';
import { seedDemoData } from './database/seed.js';
// Initialize Database
try {
    initDatabase();
    if (config.nodeEnv === 'development' || config.paymentMode === 'test') {
        seedDemoData();
    }
}
catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
}
// Start HTTP Server
const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`
  ==============================================================
  🥦 Fresh-Cart Razorpay Payment Gateway Server
  ==============================================================
  📡 Status: Running
  🌐 Host: 0.0.0.0
  🌐 Port: ${config.port}
  🔒 Mode: ${config.paymentMode.toUpperCase()} MODE
  💳 Razorpay Key ID: ${config.razorpay.keyId}
  🛡️  Signature Verification: HMAC SHA-256 Enabled
  📦 Database: SQLite (${config.database.path})
  🔗 API Base URL: http://0.0.0.0:${config.port}/api
  ==============================================================
  `);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
