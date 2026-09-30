const { exec } = require('child_process');
const path = require('path');
// Change the current working directory to the extracted temporary folder
process.chdir(path.join(__dirname, '..'));
process.env.NODE_ENV = 'production';

// Now require the server which will use process.cwd() correctly
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
