import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminCustomerForm from './AdminCustomerForm';

export default function AdminCreateCustomer() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const assignedRepId = search.get('assignedRepId') || undefined;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Customer</h1>
          <p className="text-sm text-slate-500 mt-1">Create a new customer</p>
        </div>
        <div>
          <button onClick={() => navigate('/admin/customers')} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-400" /></button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <AdminCustomerForm assignedRepId={assignedRepId} hideAssignedRepField={!!assignedRepId} onSuccess={() => navigate('/admin/customers')} onCancel={() => navigate('/admin/customers')} />
      </div>
    </div>
  );
}
