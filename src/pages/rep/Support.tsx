import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { supportApi } from '../../services/api/supportApi';
import { MessageCircle, Plus, X, AlertCircle } from 'lucide-react';
import RepSupportForm from './RepSupportForm';
import toast from 'react-hot-toast';

export default function RepSupport() {
  const [showForm, setShowForm] = useState(false);
  const { data: complaints, isLoading } = useQuery({
    queryKey: ['rep-complaints'],
    // reuse customer complaints endpoint for simplicity (backend should accept/handle based on auth)
    queryFn: () => supportApi.customerGetComplaints().then(r => r.data.data),
  });


  useEffect(() => {
    const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (typeof document === 'undefined') return;
    if (showForm && !isDesktop()) {
      document.body.style.overflow = 'hidden';
      try { window.scrollTo({ top: 0, behavior: 'instant' as any }); } catch {}
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showForm]);

  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white px-5 pt-5 pb-10">
        <h1 className="text-xl font-bold">Support</h1>
        <p className="text-emerald-200 text-sm mt-0.5">Submit and track support requests</p>
      </div>

      <div className="px-4 -mt-5 relative z-10 pb-6 space-y-4">
        <button
          onClick={() => { if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) { window.location.href = '/rep/support/new'; } else { setShowForm(true); } }}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" /> New Complaint
        </button>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="h-4 bg-slate-100 rounded-full w-3/4 skeleton mb-2" />
                <div className="h-3 bg-slate-100 rounded-full w-1/2 skeleton" />
              </div>
            ))}
          </div>
        ) : !complaints?.length ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
            <MessageCircle className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No complaints</p>
            <p className="text-xs text-slate-400 mt-1">Need help? Submit a complaint above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c: any) => (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-900">{c.subject}</h3>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600`}>{c.priority}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold bg-slate-50 text-slate-500`}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Complaint — modal on desktop, bottom-sheet on mobile */}
      {showForm && (typeof document !== 'undefined') && (
        (window.matchMedia && window.matchMedia('(min-width: 1024px)').matches) ? (
          /* Desktop: centered modal */
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 text-lg">New Complaint</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div>
                <RepSupportForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
              </div>
            </div>
          </div>
        ) : (
          /* Mobile: bottom-sheet (portal) */
          createPortal(
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div className="fixed inset-0 bottom-16 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowForm(false)} />
              <div className="fixed bottom-16 left-0 right-0 bg-white rounded-t-3xl h-auto overflow-y-auto animate-slide-up pb-safe pointer-events-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
                <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-slate-100 z-10">
                  <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-900">New Complaint</h2>
                    <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                </div>

                <div className="p-6">
                  <RepSupportForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
                </div>
              </div>
            </div>,
            document.body
          )
        )
      )}
    </div>
  );
}
