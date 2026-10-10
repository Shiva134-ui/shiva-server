import ServiceDirectoryPage from '../components/ServiceDirectoryPage';

export default function MonitoringGrafana() {
  return <ServiceDirectoryPage title="Grafana" description="Grafana container/service state reported by the server." matches={/grafana/i} />;
}
