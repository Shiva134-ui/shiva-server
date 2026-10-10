const { runCommand } = require('../utils/command');

class ContainerUpdateService {
  async getUpdatableImages() {
    const images = [];
    try {
      const out = await runCommand('docker', ['images', '--format', '{{json .}}']).catch(() => '');
      const lines = out.trim().split('\n').filter(Boolean);
      lines.forEach((l) => {
        try {
          const item = JSON.parse(l);
          if (item.Repository && item.Repository !== '<none>') {
            images.push({
              id: item.ID,
              repository: item.Repository,
              tag: item.Tag,
              createdSince: item.CreatedSince,
              size: item.Size
            });
          }
        } catch (_) {}
      });
    } catch (_) {}

    return {
      timestamp: new Date().toISOString(),
      images
    };
  }

  async pullImage(imageName) {
    if (!imageName || typeof imageName !== 'string') {
      throw new Error('Image name required');
    }

    const out = await runCommand('docker', ['pull', imageName], { timeout: 120000 });
    return {
      success: true,
      image: imageName,
      output: out.trim()
    };
  }
}

module.exports = new ContainerUpdateService();
