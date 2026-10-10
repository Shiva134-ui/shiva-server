import ServiceDirectoryPage from '../components/ServiceDirectoryPage';

export default function MonitoringPrometheus() {
  return <ServiceDirectoryPage title="Prometheus" description="Prometheus container/service state reported by the server." matches={/prometheus/i} />;
}
