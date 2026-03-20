import SupportTicketForm from '../../components/support/SupportTicketForm';
import { customerSupportConfig } from '../support/roleSupportConfigs';

type Props = { onSuccess?: () => void; onCancel?: () => void };

export default function CustomerSupportForm({ onSuccess, onCancel }: Props) {
  return (
    <SupportTicketForm
      listQueryKey={customerSupportConfig.listQueryKey}
      createTicket={customerSupportConfig.createTicket}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}
