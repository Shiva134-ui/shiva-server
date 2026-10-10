const fs = require('fs');
const path = require('path');
const { runCommand } = require('../utils/command');

const BASE_COMPOSE_DIR = '/opt/madesh-server/compose';

class ComposeEditorService {
  async listFiles() {
    const files = [];
    if (!fs.existsSync(BASE_COMPOSE_DIR)) {
      return { files };
    }

    const scanDir = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          scanDir(fullPath);
        } else if (item.isFile() && (item.name.endsWith('.yml') || item.name.endsWith('.yaml'))) {
          files.push({
            name: item.name,
            relPath: path.relative(BASE_COMPOSE_DIR, fullPath).replace(/\\/g, '/'),
            fullPath,
            sizeBytes: fs.statSync(fullPath).size
          });
        }
      }
    };

    scanDir(BASE_COMPOSE_DIR);
    return { files };
  }

  async readFile(relPath) {
    const safeRel = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(BASE_COMPOSE_DIR, safeRel);
    if (!fs.existsSync(fullPath)) throw new Error('Compose file not found');

    const content = fs.readFileSync(fullPath, 'utf8');
    return {
      relPath: safeRel,
      fullPath,
      content
    };
  }

  async saveFile(relPath, content) {
    const safeRel = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(BASE_COMPOSE_DIR, safeRel);
    if (!fs.existsSync(fullPath)) throw new Error('Target file not found');

    // Create backup
    const backupPath = `${fullPath}.${Date.now()}.bak`;
    fs.copyFileSync(fullPath, backupPath);

    fs.writeFileSync(fullPath, content, 'utf8');

    // Validate compose file
    let validation = 'valid';
    try {
      await runCommand('docker', ['compose', '-f', fullPath, 'config', '-q']);
    } catch (err) {
      validation = 'Syntax warning: ' + err.message;
    }

    return {
      success: true,
      backupCreated: backupPath,
      validation
    };
  }
}

module.exports = new ComposeEditorService();
