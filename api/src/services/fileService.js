const fs = require('fs');
const path = require('path');

const ALLOWED_ROOTS = [
  '/',
  '/home/madesh',
  '/media',
  '/opt',
  '/var/log',
  '/etc',
  '/mnt',
  '/storage'
];

async function listFiles(targetPath = '/home/madesh') {
  const safePath = path.resolve(targetPath);

  // Security: check if path starts with one of the allowed roots
  const isAllowed = ALLOWED_ROOTS.some(root => {
    if (root === '/') return true;
    return safePath === root || safePath.startsWith(root + path.sep);
  });
  if (!isAllowed) {
    const error = new Error(`Access denied to path '${safePath}'. Allowed roots: ${ALLOWED_ROOTS.join(', ')}`);
    error.status = 403;
    throw error;
  }

  let stat;
  try {
    stat = await fs.promises.stat(safePath);
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      const error = new Error(`Permission denied: '${safePath}'`);
      error.status = 403;
      throw error;
    }
    throw err;
  }

  if (!stat.isDirectory()) {
    return {
      currentPath: safePath,
      parentPath: path.dirname(safePath),
      isDirectory: false,
      file: {
        name: path.basename(safePath),
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        mode: stat.mode.toString(8)
      },
      entries: []
    };
  }

  let dirents = [];
  try {
    dirents = await fs.promises.readdir(safePath, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      const error = new Error(`Permission denied: Cannot read directory '${safePath}'`);
      error.status = 403;
      throw error;
    }
    throw err;
  }
  const entries = [];

  for (const dirent of dirents) {
    const fullPath = path.join(safePath, dirent.name);
    try {
      const entryStat = await fs.promises.stat(fullPath);
      entries.push({
        name: dirent.name,
        path: fullPath,
        isDirectory: dirent.isDirectory(),
        isFile: dirent.isFile(),
        isSymlink: dirent.isSymbolicLink(),
        size: dirent.isDirectory() ? 0 : entryStat.size,
        mtime: entryStat.mtime.toISOString(),
        mode: entryStat.mode.toString(8)
      });
    } catch (_) {
      entries.push({
        name: dirent.name,
        path: fullPath,
        isDirectory: dirent.isDirectory(),
        isFile: dirent.isFile(),
        isSymlink: dirent.isSymbolicLink(),
        size: 0,
        mtime: null,
        mode: null
      });
    }
  }

  // Sort: directories first, then alphabetical
  entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    currentPath: safePath,
    parentPath: safePath === '/' ? null : path.dirname(safePath),
    isDirectory: true,
    totalEntries: entries.length,
    entries,
    timestamp: new Date().toISOString()
  };
}

async function createDirectory(targetPath) {
  const safePath = path.resolve(targetPath);
  const isAllowed = ALLOWED_ROOTS.some(root => {
    if (root === '/') return true;
    return safePath === root || safePath.startsWith(root + path.sep);
  });
  if (!isAllowed) {
    const error = new Error(`Access denied to path '${safePath}'`);
    error.status = 403;
    throw error;
  }
  await fs.promises.mkdir(safePath, { recursive: true });
  return { success: true, path: safePath, timestamp: new Date().toISOString() };
}

async function deleteFile(targetPath) {
  const safePath = path.resolve(targetPath);
  if (ALLOWED_ROOTS.includes(safePath) || safePath === '/') {
    const error = new Error('Cannot delete system root directory');
    error.status = 400;
    throw error;
  }
  const isAllowed = ALLOWED_ROOTS.some(root => {
    if (root === '/') return true;
    return safePath.startsWith(root + path.sep);
  });
  if (!isAllowed) {
    const error = new Error(`Access denied to path '${safePath}'`);
    error.status = 403;
    throw error;
  }
  const stat = await fs.promises.stat(safePath);
  if (stat.isDirectory()) {
    await fs.promises.rm(safePath, { recursive: true, force: true });
  } else {
    await fs.promises.unlink(safePath);
  }
  return { success: true, path: safePath, timestamp: new Date().toISOString() };
}

module.exports = { listFiles, createDirectory, deleteFile, ALLOWED_ROOTS };
