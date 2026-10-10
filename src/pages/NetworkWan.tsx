import NetworkSnapshotPage from '../components/NetworkSnapshotPage';
import WanDdnsCard from '../components/network/WanDdnsCard';
import SslMonitorCard from '../components/network/SslMonitorCard';

export default function NetworkWan() {
  return (
    <div className="space-y-6 pb-8">
      {/* Dynamic DNS & Public WAN IP */}
      <WanDdnsCard />

      {/* SSL Certificates Health */}
      <SslMonitorCard />

      {/* Base WAN Telemetry */}
      <NetworkSnapshotPage view="wan" />
    </div>
  );
}
