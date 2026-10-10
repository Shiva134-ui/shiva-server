import ServiceDirectoryPage from '../components/ServiceDirectoryPage';

export default function ServicesNginx() {
  return <ServiceDirectoryPage title="Nginx" description="Nginx and reverse-proxy service state reported by the server." matches={/nginx|proxy/i} />;
}
