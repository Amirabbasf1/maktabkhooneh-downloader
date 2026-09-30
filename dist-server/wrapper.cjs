const { exec } = require('child_process');
process.env.NODE_ENV = 'production';
require('./server.cjs');
setTimeout(() => {
  const url = 'http://localhost:3000';
  console.log(`\nOpening ${url} in your default browser...\n`);
  if (process.platform === 'win32') {
    exec(`start ${url}`);
  } else if (process.platform === 'darwin') {
    exec(`open ${url}`);
  } else {
    exec(`xdg-open ${url}`);
  }
}, 1500);
