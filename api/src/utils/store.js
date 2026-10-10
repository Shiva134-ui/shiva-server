const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

class Store {
  constructor(filename, defaultData = {}) {
    this.filename = filename;
    this.filepath = path.join(DATA_DIR, filename);
    this.defaultData = defaultData;
    this.memoryCache = null;
    this.writePromise = null;
  }

  async read() {
    if (this.memoryCache) return this.memoryCache;
    
    await ensureDataDir();
    try {
      const data = await fs.readFile(this.filepath, 'utf8');
      const parsedData = JSON.parse(data);
      // Shallow merge to ensure missing keys from defaults are provided
      this.memoryCache = { ...this.defaultData, ...parsedData };
      return this.memoryCache;
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.memoryCache = { ...this.defaultData };
        await this.write(this.memoryCache);
        return this.memoryCache;
      }
      throw err;
    }
  }

  async write(data) {
    // Basic atomic write via temp file
    const tempFile = `${this.filepath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    
    // Wait for any ongoing write to finish to avoid race conditions
    while (this.writePromise) {
      await this.writePromise;
    }
    
    this.writePromise = (async () => {
      try {
        await ensureDataDir();
        this.memoryCache = data;
        await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
        await fs.rename(tempFile, this.filepath);
      } finally {
        this.writePromise = null;
      }
    })();
    
    return this.writePromise;
  }
}

module.exports = Store;
