import ServiceDirectoryPage from '../components/ServiceDirectoryPage';
import CraftyMinecraftCard from '../components/services/CraftyMinecraftCard';
import NextcloudCard from '../components/services/NextcloudCard';
import NginxCard from '../components/services/NginxCard';

export default function ServicesApps() {
  return (
    <div className="space-y-6 pb-12">
      {/* Featured Homelab Applications */}
      <div className="space-y-5">
        {/* Nextcloud Hub Cloud Storage */}
        <NextcloudCard />

        {/* Nginx Proxy Manager Reverse Proxy */}
        <NginxCard />

        {/* Crafty 4 Minecraft Server Controller */}
        <CraftyMinecraftCard />
      </div>

      {/* Other Homelab Applications & System Inventory */}
      <ServiceDirectoryPage 
        title="Other Apps, Daemons & Containers" 
        description="Comprehensive live status, lifecycle controls, and telemetry across all Docker containers and Ubuntu background services." 
      />
    </div>
  );
}
