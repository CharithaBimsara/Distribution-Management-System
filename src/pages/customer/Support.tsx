import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supportApi } from '../../services/api/supportApi';
import { formatDate } from '../../utils/formatters';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { type Column } from '../../components/common/DataTable';
import MobileTileList from '../../components/common/MobileTileList';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import BottomSheet from '../../components/common/BottomSheet';
import CustomerSupportForm from './CustomerSupportForm';
import { MessageCircle, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { Complaint } from '../../types/common.types';

export default function CustomerSupport() {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['customer-complaints'],
    queryFn: () => supportApi.customerGetComplaints().then((r) => r.data.data),
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'Resolved':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'InProgress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  const priorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      High: 'bg-red-50 text-red-600',
      Low: 'bg-slate-100 text-slate-500',
      Medium: 'bg-orange-50 text-orange-600',
    };
    return map[priority] || map.Medium;
  };

  const complaintList = complaints || [];

  const handleRowClick = (c: Complaint) => {
    if (!desktop) setSelectedComplaint(c);
  };

  const handleNewComplaint = () => {
    if (desktop) {
      navigate('/shop/support/new');
    } else {
      setShowForm(true);
    }
  };

  /* ─── Desktop Columns ─── */
  const columns: Column<Complaint>[] = [
    {
      key: 'subject',
      header: 'Subject',
      render: (c) => (
        <div className="flex items-center gap-2">
          {statusIcon(c.status)}
          <span className="font-medium text-slate-900">{c.subject}</span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (c) => <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityBadge(c.priority)}`}>{c.priority}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (c) => <span className="text-slate-500">{formatDate(c.createdAt)}</span>,
    },
    {
      key: 'resolvedAt',
      header: 'Resolved',
      render: (c) => (c.resolvedAt ? <span className="text-emerald-500 text-xs">{formatDate(c.resolvedAt)}</span> : <span className="text-slate-300">—</span>),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Support"
        subtitle="Submit and track your complaints"
        actions={[{ label: 'New Complaint', icon: Plus, onClick: handleNewComplaint }]}
      />

      <div className="px-4 lg:px-6 pb-6 space-y-4">
        {desktop ? (
          <DataTable
            data={complaintList}
            columns={columns}
            keyField="id"
            isLoading={isLoading}
            page={1}
            totalPages={1}
            onPageChange={() => {}}
            onRowClick={handleRowClick}
            emptyState={
              <EmptyState
                icon={MessageCircle}
                title="No complaints"
                description="Need help? Submit a complaint"
                action={{ label: 'New Complaint', onClick: handleNewComplaint }}
              />
            }
          />
        ) : (
          <MobileTileList
            data={complaintList}
            keyField="id"
            isLoading={isLoading}
            page={1}
            totalPages={1}
            onPageChange={() => {}}
            onTileClick={handleRowClick}
            emptyState={
              <EmptyState
                icon={MessageCircle}
                title="No complaints"
                description="Need help? Submit a complaint"
                action={{ label: 'New Complaint', onClick: handleNewComplaint }}
              />
            }
            renderTile={(c) => (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {statusIcon(c.status)}
                    <h3 className="text-sm font-semibold text-slate-900">{c.subject}</h3>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityBadge(c.priority)}`}>{c.priority}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                  <StatusBadge status={c.status} />
                </div>
                {c.resolvedAt && <p className="text-[10px] text-emerald-500 mt-2">Resolved on {formatDate(c.resolvedAt)}</p>}
              </div>
            )}
          />
        )}
      </div>

      {/* Mobile Bottom Sheet — Complaint Detail */}
      <BottomSheet open={!!selectedComplaint && !desktop} onClose={() => setSelectedComplaint(null)} title={selectedComplaint?.subject || 'Complaint'}>
        {selectedComplaint && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedComplaint.status} />
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityBadge(selectedComplaint.priority)}`}>
                {selectedComplaint.priority}
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-medium mb-1">Description</p>
              <p className="text-sm text-slate-700">{selectedComplaint.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Created</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDate(selectedComplaint.createdAt)}</p>
              </div>
              {selectedComplaint.resolvedAt && (
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Resolved</p>
                  <p className="text-sm font-semibold text-emerald-700 mt-0.5">{formatDate(selectedComplaint.resolvedAt)}</p>
                </div>
              )}
            </div>

            {selectedComplaint.resolution && (
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-emerald-400 font-medium mb-1">Resolution</p>
                <p className="text-sm text-emerald-700">{selectedComplaint.resolution}</p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Mobile Bottom Sheet — New Complaint Form */}
      <BottomSheet open={showForm && !desktop} onClose={() => setShowForm(false)} title="New Complaint">
        <CustomerSupportForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </BottomSheet>
    </div>
  );
}
