// backend/server.js
// HTTP server entry point

const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Student Result Management System – Backend Server   ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Server running on  http://localhost:${PORT}            ║`);
  console.log(`║  Environment        ${(process.env.NODE_ENV || 'development').padEnd(36)}║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  DEMO CREDENTIALS                                     ║');
  console.log('║  Admin   : admin / Admin@123                          ║');
  console.log('║  Student : STU2024001 / Student@123                   ║');
  console.log('║  Faculty : FAC001 / Faculty@123                       ║');
  console.log('╚══════════════════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received. Shutting down...');
  server.close(() => process.exit(0));
});
