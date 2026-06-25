// @ts-nocheck
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quickRequestApi } from '../../services/api/quickRequestApi';
import toast from 'react-hot-toast';
import {
  ShoppingCart, FileText, Camera, ImagePlus, X,
  Send,
} from 'lucide-react';

// ── Simple lightbox for local image preview ───────────────────────────────────

function ImagePreview({ url, onClose }: { url: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition" onClick={onClose}>
        <X className="w-5 h-5" />
      </button>
      <img src={url} alt="Preview" className="max-h-[90vh] max-w-[92vw] rounded-xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
    </div>,
    document.body,
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RepQuickRequest() {
  const qc = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Form state
  const [type, setType] = useState<'Order' | 'Quotation'>('Order');
  const [customerName, setCustomerName] = useState('');
  const [details, setDetails] = useState('');
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fullPreview, setFullPreview] = useState<string | null>(null);

  const submitMut = useMutation({
    mutationFn: async () => {
      // 1. Create the request
      const res = await quickRequestApi.create({ type, customerName: customerName.trim(), details: details.trim() });
      const created = res.data.data;
      // 2. Upload images if any
      if (pendingImages.length > 0) {
        await quickRequestApi.uploadImages(created.id, pendingImages);
      }
      return created;
    },
    onSuccess: () => {
      toast.success('Submitted successfully!');
      setCustomerName('');
      setDetails('');
      setPendingImages([]);
      setPreviewUrls([]);
      qc.invalidateQueries({ queryKey: ['rep-quick-requests'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Submission failed'),
  });

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const valid = arr.filter(f => validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024);
    if (valid.length < arr.length) toast.error('Some files skipped (unsupported type or >10 MB)');
    setPendingImages(prev => [...prev, ...valid]);
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviewUrls(prev => [...prev, e.target!.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (i: number) => {
    setPendingImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviewUrls(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = () => {
    if (!customerName.trim()) { toast.error('Customer name is required'); return; }
    if (!details.trim()) { toast.error('Details are required'); return; }
    submitMut.mutate();
  };

  const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

  return (
    <div className="animate-fade-in space-y-5 pb-10">
      {fullPreview && <ImagePreview url={fullPreview} onClose={() => setFullPreview(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Quick Order / Quotation</h1>
        <p className="text-sm text-slate-500 mt-0.5">Submit a quick order or quotation request with free-text details and photos</p>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-violet-600" /> New Request
          </h2>
        </div>

        <div className="p-5 space-y-5">
          {/* Type toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Request Type *</label>
            <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden">
              {(['Order', 'Quotation'] as const).map(t => (
                <button key={t}
                  onClick={() => setType(t)}
                  className={`px-5 py-2.5 text-sm font-semibold transition flex items-center gap-2 ${
                    type === t
                      ? t === 'Order'
                        ? 'bg-violet-600 text-white'
                        : 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}>
                  {t === 'Order' ? <ShoppingCart className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Customer name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Customer Name *</label>
            <input
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Enter customer / shop name…"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
            />
          </div>

          {/* Details textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Order / Quotation Details *</label>
            <p className="text-[11px] text-slate-400 mb-1.5">
              List each item or requirement on a new line. Use a dash (–) or bullet (•) for clarity.
            </p>
            <textarea
              rows={7}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder={"• Product A – 10 units\n• Product B – 5 units, red colour\n• Special packaging required\n• Deliver before end of month"}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none resize-y font-mono leading-relaxed"
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Attach Photos (optional)</label>
            <div className="flex flex-wrap gap-3">
              {/* Preview tiles */}
              {previewUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 group cursor-pointer"
                  onClick={() => setFullPreview(url)}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                    onClick={e => { e.stopPropagation(); removeImage(i); }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Gallery button */}
              <button
                onClick={() => galleryRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-violet-400 hover:text-violet-500 transition">
                <ImagePlus className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Gallery</span>
              </button>
              {/* Camera button */}
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-violet-400 hover:text-violet-500 transition">
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Camera</span>
              </button>
            </div>
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { addImages(e.target.files); e.target.value = ''; }} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={e => { addImages(e.target.files); e.target.value = ''; }} />
            <p className="text-[11px] text-slate-400 mt-1.5">JPEG, PNG, WebP or GIF · max 10 MB each</p>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitMut.isPending}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 ${
                type === 'Order' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}>
              {submitMut.isPending
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</>
                : <><Send className="w-4 h-4" /> Submit {type}</>}
            </button>
          </div>
        </div>
      </div>

      {/* Tip: view submissions */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
        View your submitted quick orders in <strong className="text-slate-700">Orders → Quick Orders</strong> tab,
        and quick quotations in <strong className="text-slate-700">Quotations → Quick Quotations</strong> tab.
      </div>
    </div>
  );
}
