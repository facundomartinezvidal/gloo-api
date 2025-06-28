import app from './app';

const port = Number(process.env.PORT) || 5000;

app.listen(port, '0.0.0.0', () => {
  /* eslint-disable no-console */
  console.log(`✅ Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  /* eslint-enable no-console */
}).on('error', (err) => {
  console.error('❌ Error starting server:', err);
  process.exit(1);
});
