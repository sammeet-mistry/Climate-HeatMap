const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function resolveJavaBin() {
  const envJavaHome = process.env.JAVA_HOME;
  const candidates = [];

  if (envJavaHome) {
    candidates.push(path.join(envJavaHome, 'bin'));
  }

  if (process.platform === 'win32') {
    candidates.push('C:\\Program Files\\Android\\openjdk\\jdk-21.0.8\\bin');
    candidates.push('C:\\Program Files\\Java\\jdk-21\\bin');
    candidates.push('C:\\Program Files\\Java\\jdk-17\\bin');
  } else {
    candidates.push('/usr/lib/jvm/default-java/bin');
    candidates.push('/usr/lib/jvm/java-21-openjdk-amd64/bin');
    candidates.push('/usr/lib/jvm/java-17-openjdk-amd64/bin');
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    const javac = path.join(candidate, process.platform === 'win32' ? 'javac.exe' : 'javac');
    const java = path.join(candidate, process.platform === 'win32' ? 'java.exe' : 'java');
    if (fs.existsSync(javac) && fs.existsSync(java)) {
      return { javac, java };
    }
  }

  return {
    javac: process.platform === 'win32' ? 'javac.exe' : 'javac',
    java: process.platform === 'win32' ? 'java.exe' : 'java'
  };
}

const { javac, java } = resolveJavaBin();

const compile = spawn(javac, ['TestJUnit.java', 'TestRunner.java'], {
  cwd: __dirname,
  stdio: 'inherit'
});

compile.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code);
    return;
  }

  const run = spawn(java, ['-cp', __dirname, 'TestRunner'], {
    stdio: 'inherit'
  });

  run.on('exit', (runCode) => {
    process.exit(runCode);
  });
});
