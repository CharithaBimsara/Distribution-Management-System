// @ts-nocheck
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  Package,
  Plus,
  Send,
  ShoppingCart,
  Trash2,
  User,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { quickRequestApi } from '../../services/api/quickRequestApi';

type RequestType = 'Order' | 'Quotation';

type ItemRow = {
  id: string;
  item: string;
  quantity: string;
};

function createClientId() {
  const cryptoApi = globalThis.crypto;

  if (
    cryptoApi &&
    typeof cryptoApi.randomUUID === 'function'
  ) {
    return cryptoApi.randomUUID();
  }

  return `row-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createEmptyRow(): ItemRow {
  return {
    id: createClientId(),
    item: '',
    quantity: '1',
  };
}

function ImagePreview({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Close preview"
      >
        <X className="h-5 w-5" />
      </button>

      <img
        src={url}
        alt="Attachment preview"
        className="max-h-[90vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

export default function RepQuickRequest() {
  const queryClient = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [type, setType] =
    useState<RequestType>('Order');
  const [customerName, setCustomerName] =
    useState('');
  const [itemRows, setItemRows] =
    useState<ItemRow[]>([createEmptyRow()]);
  const [pendingImages, setPendingImages] =
    useState<File[]>([]);
  const [previewUrls, setPreviewUrls] =
    useState<string[]>([]);
  const [fullPreview, setFullPreview] =
    useState<string | null>(null);

  const validRows = useMemo(
    () =>
      itemRows.filter(
        (row) => row.item.trim().length > 0,
      ),
    [itemRows],
  );

  const totalQuantity = useMemo(
    () =>
      validRows.reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            Number(row.quantity) || 0,
          ),
        0,
      ),
    [validRows],
  );

  const requestDetails = useMemo(
    () =>
      validRows
        .map((row) => {
          const quantity = Math.max(
            1,
            Number(row.quantity) || 1,
          );

          return `${row.item.trim()} — Qty ${quantity}`;
        })
        .join('\n'),
    [validRows],
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response =
        await quickRequestApi.create({
          type,
          customerName: customerName.trim(),
          details: requestDetails,
        });

      const created = response.data.data;

      if (pendingImages.length > 0) {
        await quickRequestApi.uploadImages(
          created.id,
          pendingImages,
        );
      }

      return created;
    },

    onSuccess: () => {
      toast.success(`${type} submitted successfully`);

      setCustomerName('');
      setItemRows([createEmptyRow()]);
      setPendingImages([]);
      setPreviewUrls([]);

      queryClient.invalidateQueries({
        queryKey: ['rep-quick-requests'],
      });

      queryClient.invalidateQueries({
        queryKey: ['rep-orders'],
      });
    },

    onError: (error: any) =>
      toast.error(
        error?.response?.data?.message ||
          'Submission failed',
      ),
  });

  const addRow = () => {
    setItemRows((current) => [
      ...current,
      createEmptyRow(),
    ]);
  };

  const updateRow = (
    rowId: string,
    changes: Partial<ItemRow>,
  ) => {
    setItemRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...changes,
            }
          : row,
      ),
    );
  };

  const removeRow = (rowId: string) => {
    setItemRows((current) => {
      const next = current.filter(
        (row) => row.id !== rowId,
      );

      return next.length
        ? next
        : [createEmptyRow()];
    });
  };

  const addImages = (files: FileList | null) => {
    if (!files) return;

    const selectedFiles = Array.from(files);
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    const validFiles = selectedFiles.filter(
      (file) =>
        validTypes.includes(file.type) &&
        file.size <= 10 * 1024 * 1024,
    );

    if (validFiles.length < selectedFiles.length) {
      toast.error(
        'Some files were skipped. Use supported images under 10 MB.',
      );
    }

    setPendingImages((current) => [
      ...current,
      ...validFiles,
    ]);

    validFiles.forEach((file) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const result =
          event.target?.result as string;

        if (!result) return;

        setPreviewUrls((current) => [
          ...current,
          result,
        ]);
      };

      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setPendingImages((current) =>
      current.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    );

    setPreviewUrls((current) =>
      current.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    );
  };

  const handleSubmit = () => {
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    if (validRows.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    const invalidQuantity = validRows.some(
      (row) =>
        !Number.isFinite(Number(row.quantity)) ||
        Number(row.quantity) < 1,
    );

    if (invalidQuantity) {
      toast.error(
        'Every item quantity must be at least 1',
      );
      return;
    }

    submitMutation.mutate();
  };

  useEffect(() => {
    if (
      itemRows.length > 0 &&
      itemRows[itemRows.length - 1].item.trim()
    ) {
      setItemRows((current) => [
        ...current,
        createEmptyRow(),
      ]);
    }
  }, [itemRows]);

  const canSubmit =
    customerName.trim().length > 0 &&
    validRows.length > 0 &&
    !submitMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in space-y-4 px-3 pb-16 pt-2 sm:px-5 sm:pt-4 lg:px-0 lg:pt-0">
      {fullPreview && (
        <ImagePreview
          url={fullPreview}
          onClose={() => setFullPreview(null)}
        />
      )}

      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl bg-emerald-700 px-4 py-5 text-white shadow-sm sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
              Sales Request
            </p>

            <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
              Quick Order / Quotation
            </h1>

            <p className="mt-1 text-xs text-emerald-100 sm:text-sm">
              Add items, quantities and photos
            </p>
          </div>

          <div className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:flex">
            {type === 'Order' ? (
              <ShoppingCart className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <main className="min-w-0 space-y-4">
          {/* Request basics */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-4 p-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-5">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Type
                </label>

                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {(
                    [
                      'Order',
                      'Quotation',
                    ] as const
                  ).map((requestType) => (
                    <button
                      key={requestType}
                      type="button"
                      onClick={() =>
                        setType(requestType)
                      }
                      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                        type === requestType
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-white'
                      }`}
                    >
                      {requestType === 'Order' ? (
                        <ShoppingCart className="h-3.5 w-3.5" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}

                      {requestType}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Customer / Shop
                </label>

                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(
                        event.target.value,
                      )
                    }
                    placeholder="Enter customer or shop name"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Item entry table */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Package className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    Items
                  </p>

                  <h2 className="mt-0.5 text-sm font-black text-slate-900">
                    Item Entry
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="hidden min-h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition active:bg-emerald-100 sm:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Row
              </button>
            </div>

            <div className="w-full">
              <div className="grid grid-cols-[minmax(0,1fr)_58px_36px] border-b border-emerald-200 bg-emerald-50 text-[10px] font-bold uppercase tracking-wide text-emerald-950 sm:grid-cols-[32px_minmax(0,1fr)_76px_38px]">
                <div className="hidden px-2 py-2.5 text-center sm:block">
                  #
                </div>

                <div className="px-3 py-2.5 sm:border-l sm:border-emerald-200">
                  Item
                </div>

                <div className="border-l border-emerald-200 px-1 py-2.5 text-center">
                  Qty
                </div>

                <div className="border-l border-emerald-200" />
              </div>

              <div className="divide-y divide-slate-100">
                {itemRows.map(
                  (row, rowIndex) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[minmax(0,1fr)_58px_36px] items-center bg-white sm:grid-cols-[32px_minmax(0,1fr)_76px_38px]"
                    >
                      <div className="hidden px-2 py-2 text-center text-[10px] font-bold text-slate-400 sm:block">
                        {rowIndex + 1}
                      </div>

                      <div className="min-w-0 p-1.5 sm:border-l sm:border-slate-100">
                        <input
                          value={row.item}
                          onChange={(event) =>
                            updateRow(row.id, {
                              item:
                                event.target.value,
                            })
                          }
                          placeholder="Item name"
                          className="h-9 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-300 focus:bg-emerald-50/40 sm:px-2.5 sm:text-sm"
                        />
                      </div>

                      <div className="border-l border-slate-100 p-1">
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={row.quantity}
                          onChange={(event) =>
                            updateRow(row.id, {
                              quantity:
                                event.target.value,
                            })
                          }
                          onBlur={() => {
                            if (
                              !row.quantity ||
                              Number(row.quantity) <
                                1
                            ) {
                              updateRow(row.id, {
                                quantity: '1',
                              });
                            }
                          }}
                          className="h-9 w-full appearance-none rounded-lg border border-transparent bg-transparent px-1 text-center text-[13px] font-black text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-emerald-50/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          style={{
                            MozAppearance:
                              'textfield',
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-center border-l border-slate-100">
                        <button
                          type="button"
                          onClick={() =>
                            removeRow(row.id)
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition active:bg-red-50 active:text-red-600 sm:hover:bg-red-50 sm:hover:text-red-600"
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </section>

          {/* Photos */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ImagePlus className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    Attachments
                  </p>

                  <h2 className="mt-0.5 text-sm font-black text-slate-900">
                    Photos
                  </h2>
                </div>
              </div>

              {pendingImages.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  {pendingImages.length}
                </span>
              )}
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap gap-2.5">
                {previewUrls.map(
                  (url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="group relative h-[76px] w-[76px] overflow-visible rounded-xl border border-slate-200 bg-slate-100 sm:h-20 sm:w-20"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setFullPreview(url)
                        }
                        className="h-full w-full overflow-hidden rounded-xl"
                      >
                        <img
                          src={url}
                          alt={`Attachment ${
                            index + 1
                          }`}
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(index)
                        }
                        className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-100 bg-white text-rose-600 shadow-md transition active:scale-95 active:bg-rose-50"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ),
                )}

                <button
                  type="button"
                  onClick={() =>
                    galleryRef.current?.click()
                  }
                  className="inline-flex h-20 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition active:border-emerald-400 active:bg-emerald-50 active:text-emerald-700"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-bold">
                    Gallery
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    cameraRef.current?.click()
                  }
                  className="inline-flex h-20 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition active:border-emerald-400 active:bg-emerald-50 active:text-emerald-700"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-[10px] font-bold">
                    Camera
                  </span>
                </button>
              </div>

              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  addImages(event.target.files);
                  event.target.value = '';
                }}
              />

              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  addImages(event.target.files);
                  event.target.value = '';
                }}
              />
            </div>
          </section>


        </main>

        {/* Summary / submit */}
        <aside className="min-w-0">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-4">
            <div className="bg-emerald-700 px-4 py-4 text-white">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-100">
                Request Summary
              </p>

              <h2 className="mt-1 text-lg font-black">
                {type}
              </h2>
            </div>

            <div className="p-4">
              <div className="space-y-3 text-xs">
                <SummaryRow
                  label="Customer"
                  value={
                    customerName.trim() ||
                    'Not entered'
                  }
                />

                <SummaryRow
                  label="Item lines"
                  value={String(validRows.length)}
                />

                <SummaryRow
                  label="Total quantity"
                  value={String(totalQuantity)}
                />

                <SummaryRow
                  label="Photos"
                  value={String(
                    pendingImages.length,
                  )}
                />
              </div>

              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" />

                  <p className="text-[11px] font-semibold leading-5 text-emerald-800">
                    Items and quantities will be submitted in order.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white shadow-lg shadow-emerald-700/15 transition active:scale-[0.99] active:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                {submitMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit {type}
                  </>
                )}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex-shrink-0 text-slate-500">
        {label}
      </span>

      <span className="min-w-0 break-words text-right font-bold text-slate-900">
        {value}
      </span>
    </div>
  );
}