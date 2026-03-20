import UnifiedSupportPage from '../../components/support/UnifiedSupportPage';
import { customerSupportConfig } from '../support/roleSupportConfigs';

export default function CustomerSupport() {
  return <UnifiedSupportPage config={customerSupportConfig} />;
}
