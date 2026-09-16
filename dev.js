const { spawn } = require('child_process');

const backend = spawn('python', ['backend/app.py'], { stdio: 'inherit' });
const frontend = spawn('python', ['-m', 'http.server', '4173', '--directory', 'frontend'], { stdio: 'inherit' });

const cleanup = () => {
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
