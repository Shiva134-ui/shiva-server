import ServiceDirectoryPage from '../components/ServiceDirectoryPage';

export default function ServicesNextcloud() {
  return <ServiceDirectoryPage title="Nextcloud" description="Nextcloud-related service state reported by the server." matches={/nextcloud/i} />;
}
