const express = require('express');
const { spawn } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'GullyCricketX is running' });
});

// Serve static files
app.use(express.static(__dirname));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  
  // Start Expo in the background
  const expo = spawn('npx', ['expo', 'start', '--web', '--no-dev', '--minify'], {
    stdio: 'pipe',
    shell: true
  });
  
  expo.stdout.on('data', (data) => {
    console.log(`Expo: ${data}`);
  });
  
  expo.stderr.on('data', (data) => {
    console.log(`Expo Error: ${data}`);
  });
}); 