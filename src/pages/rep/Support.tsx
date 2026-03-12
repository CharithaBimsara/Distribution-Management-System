import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supportApi } from '../../services/api/supportApi';
import { MessageCircle, Plus, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { type Column } from '../../components/common/DataTable';
import MobileTileList from '../../components/common/MobileTileList';
import BottomSheet from '../../components/common/BottomSheet';
import RepSupportForm from './RepSupportForm';

export default function RepSupport() {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['rep-complaints'],
    queryFn: () => supportApi.repGetComplaints().then(r => r.data.data),
  });

  const items = complaints || [];

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = { Low: 'bg-slate-100 text-slate-600', Medium: 'bg-amber-50 text-amber-600', High: 'bg-red-50 text-red-600', Critical: 'bg-red-100 text-red-700' };
    return map[p] || 'bg-slate-100 text-slate-600';
  };

  const columns: Column<any>[] = [
    {
      key: 'subject', header: 'Subject',
      render: (c) => (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="font-medium text-slate-800">{c.subject}</span>
        </div>
      ),
    },
    { key: 'description', header: 'Description', render: (c) => <span className="text-sm text-slate-500 line-clamp-1">{c.description}</span> },
    { key: 'priority', header: 'Priority', align: 'center' as const, render: (c) => <span className={`text-xs font-semibold px-2 py-1 rounded-full ${priorityBadge(c.priority)}`}>{c.priority}</span> },
    { key: 'status', header: 'Status', align: 'center' as const, render: (c) => <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-50 text-slate-600">{c.status}</span> },
    { key: 'createdAt', header: 'Created', render: (c) => <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span> },
  ];

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      <PageHeader title="Support" subtitle="Submit and track support requests"
        actions={[{
          label: 'New Complaint',
          onClick: () => isDesktop ? navigate('/rep/support/new') : setShowForm(true),
          icon: Plus,
          variant: 'primary' as const,
        }]} />

      {isDesktop ? (
        <DataTable columns={columns} data={items} isLoading={isLoading} keyExtractor={(c) => c.id}
          onRowClick={(c) => setSelected(c)} emptyIcon={<MessageCircle className="w-12 h-12 text-slate-300" />}
          emptyTitle="No complaints" emptyDescription="Need help? Submit a complaint above"
          page={1} totalPages={1} />
      ) : (
        <MobileTileList data={items} isLoading={isLoading} keyExtractor={(c) => c.id}
          onTileClick={(c) => setSelected(c)} page={1} totalPages={1}
          renderTile={(c) => (
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900">{c.subject}</h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityBadge(c.priority)}`}>{c.priority}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{c.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-slate-50 text-slate-500">{c.status}</span>
              </div>
            </div>
          )}
        />
      )}

      {/* Complaint Detail BottomSheet */}
      <BottomSheet isOpen={!!selected} onClose={() => setSelected(null)} title="Complaint Details">
        {selected && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900">{selected.subject}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${priorityBadge(selected.priority)}`}>{selected.priority}</span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-50 text-slate-600">{selected.status}</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{selected.description}</p>
            </div>
            <p className="text-xs text-slate-400">Created: {new Date(selected.createdAt).toLocaleString()}</p>
          </div>
        )}
      </BottomSheet>

      {/* New Complaint BottomSheet */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title="New Complaint">
        <RepSupportForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </BottomSheet>
    </div>
  );
}
