import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerRegistrationApi } from '../../services/api/customerRegistrationApi';

// ── Shared input/label styles (matching system Login theme) ───────────────────
const INPUT_STYLE = {
  padding: '12px 14px',
  fontSize: '14px',
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1.5px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  color: '#f1f5f9',
  width: '100%',
  outline: 'none',
  transition: 'all 0.2s',
} as const;

const LABEL_STYLE = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: '8px',
} as const;

const SECTION_CARD_STYLE = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: '20px',
} as const;

const STEPS = ['General', 'Professional', 'Documents', 'Review'];

// ── Input component ────────────────────────────────────────────────────────────
function Field({
  label, name, value, onChange, type = 'text', required = false, placeholder, error,
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; required?: boolean; placeholder?: string; error?: string;
}) {
  return (
    <div>
      <label style={LABEL_STYLE}>
        {label}
        {required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
      </label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        required={required}
        style={{
          ...INPUT_STYLE,
          border: error ? '1.5px solid rgba(248, 113, 113, 0.7)' : INPUT_STYLE.border,
          boxShadow: error ? '0 0 0 3px rgba(248, 113, 113, 0.18)' : 'none',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
          e.target.style.background = 'rgba(255, 255, 255, 0.08)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          e.target.style.boxShadow = 'none';
          e.target.style.background = 'rgba(255, 255, 255, 0.06)';
        }}
      />
      {error && <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function SelectField({
  label, name, value, onChange, children, required = false, disabled = false, error,
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={LABEL_STYLE}>
        {label}
        {required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
      </label>
      <select
        name={name} value={value} onChange={onChange}
        disabled={disabled}
        style={{
          ...INPUT_STYLE,
          colorScheme: 'dark',
          border: error ? '1.5px solid rgba(248, 113, 113, 0.7)' : INPUT_STYLE.border,
          boxShadow: error ? '0 0 0 3px rgba(248, 113, 113, 0.18)' : 'none',
        } as React.CSSProperties}
        onFocus={(e) => {
          e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
          e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
          e.target.style.background = 'rgba(255, 255, 255, 0.08)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          e.target.style.boxShadow = 'none';
          e.target.style.background = 'rgba(255, 255, 255, 0.06)';
        }}
      >
        {children}
      </select>
      {error && <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function FileUpload({
  label, name, onChange, required = false, error,
}: {
  label: string; name: string;
  onChange: (name: string, file: File | null) => void;
  required?: boolean;
  error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);

  const handle = (f: File) => { setFile(f); onChange(name, f); };

  return (
    <div>
      <label style={LABEL_STYLE}>
        {label}
        {required && <span style={{ color: '#f87171', marginLeft: 4 }}>*</span>}
      </label>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
        style={{
          border: `2px dashed ${error ? 'rgba(248,113,113,0.8)' : drag ? 'rgba(99,102,241,0.7)' : file ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: '14px',
          padding: '28px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          background: drag ? 'rgba(99,102,241,0.08)' : file ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.03)',
          transition: 'all 0.2s',
        }}
      >
        <svg
          style={{ width: 36, height: 36, color: file ? '#818cf8' : 'rgba(255,255,255,0.2)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <div style={{ textAlign: 'center' }}>
          {file ? (
            <p style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 500, wordBreak: 'break-all' }}>{file.name}</p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                <span style={{ color: '#818cf8', fontWeight: 600 }}>Click to upload</span> or drag &amp; drop
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>PDF, JPG, PNG — max 10 MB</p>
            </>
          )}
        </div>
        <input
          ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, transition: 'all 0.3s',
              background: i <= current ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.07)',
              color: i <= current ? '#fff' : 'rgba(255,255,255,0.3)',
              boxShadow: i === current ? '0 0 0 3px rgba(99,102,241,0.2), 0 4px 12px rgba(99,102,241,0.3)' : 'none',
              flexShrink: 0,
            }}>
              {i < current ? (
                <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span style={{
              fontSize: 10, marginTop: 4, fontWeight: 500, textAlign: 'center',
              color: i === current ? '#a5b4fc' : i < current ? 'rgba(165,180,252,0.5)' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap',
            }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              width: 24, height: 1, margin: '0 4px', marginBottom: 18,
              background: i < current ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.08)',
              transition: 'all 0.5s',
              flexShrink: 0,
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface FormState {
  customerName: string; registeredAddress: string; incorporateDate: string;
  businessName: string; businessLocation: string; telephone: string; email: string; bankBranch: string;
  regionId: string; subRegionId: string;
  province: string; town: string;
  proprietorName: string; proprietorTp: string; proprietorEmail: string;
  managerName: string; managerTp: string; managerEmail: string;
  chefName: string; chefTp: string; chefEmail: string;
  purchasingName: string; purchasingTp: string; purchasingEmail: string;
  accountantName: string; accountantTp: string; accountantEmail: string;
}
type FilesState = { businessReg?: File; businessAddress?: File; vatDocument?: File };

const CONTACTS = [
  { role: 'Proprietor / Owner', prefix: 'proprietor' as const },
  { role: 'Manager', prefix: 'manager' as const },
  { role: 'Chef', prefix: 'chef' as const },
  { role: 'Purchasing Officer', prefix: 'purchasing' as const },
  { role: 'Accountant', prefix: 'accountant' as const },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s()-]{7,20}$/;

// ── Main component ─────────────────────────────────────────────────────────────
export default function CustomerRegistration() {
  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [customerType, setCustomerType] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormState>({
    customerName: '', registeredAddress: '', incorporateDate: '',
    businessName: '', businessLocation: '', telephone: '', email: '', bankBranch: '',
    regionId: '', subRegionId: '',
    province: '', town: '',
    proprietorName: '', proprietorTp: '', proprietorEmail: '',
    managerName: '', managerTp: '', managerEmail: '',
    chefName: '', chefTp: '', chefEmail: '',
    purchasingName: '', purchasingTp: '', purchasingEmail: '',
    accountantName: '', accountantTp: '', accountantEmail: '',
  });
  const [files, setFiles] = useState<FilesState>({});

  const {
    data: regions,
    isLoading: regionsLoading,
    isError: regionsError,
    refetch: refetchRegions,
  } = useQuery({
    queryKey: ['public-registration-regions'],
    queryFn: () => customerRegistrationApi.getPublicRegions().then(r => r.data.data || []),
    retry: 1,
  });

  const {
    data: subRegions,
    isLoading: subRegionsLoading,
    isError: subRegionsError,
    refetch: refetchSubRegions,
  } = useQuery({
    queryKey: ['public-registration-sub-regions', form.regionId],
    queryFn: () => customerRegistrationApi.getPublicSubRegions(form.regionId).then(r => r.data.data || []),
    enabled: !!form.regionId,
    retry: 1,
  });

  const upd = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setError('');
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setForm((f) => {
      if (name === 'regionId') {
        return { ...f, regionId: value, subRegionId: '' };
      }
      return { ...f, [name]: value };
    });
  };

  const setFile = (name: string, file: File | null) =>
    setFiles(f => ({ ...f, [name]: file ?? undefined }));

  const onFileSet = (name: string, file: File | null) => {
    setFile(name, file);
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const goNext = () => {
    const validation = getStepValidation(step);
    if (Object.keys(validation.fieldErrors).length > 0 || validation.formError) {
      setFieldErrors(validation.fieldErrors);
      setError(validation.formError || 'Please correct the highlighted fields.');
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setFieldErrors({});
    setError('');
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setStep(s => s + 1);
  };
  const goBack = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setStep(s => s - 1);
  };

  const getStepValidation = (targetStep: number) => {
    const errors: Record<string, string> = {};

    if (targetStep === 0) {
      if (!customerType) errors.customerType = 'Please select customer type.';
      if (!form.customerName.trim()) errors.customerName = 'Customer name is required.';
      if (!form.telephone.trim()) {
        errors.telephone = 'Telephone is required.';
      } else if (!PHONE_REGEX.test(form.telephone.trim())) {
        errors.telephone = 'Please enter a valid telephone number.';
      }
      if (!form.email.trim()) {
        errors.email = 'Email is required.';
      } else if (!EMAIL_REGEX.test(form.email.trim())) {
        errors.email = 'Please enter a valid email address.';
      }
      if (!form.regionId) errors.regionId = 'Please select a region.';
      return {
        fieldErrors: errors,
        formError: Object.keys(errors).length > 0 ? 'Please correct the highlighted fields.' : '',
      };
    }

    if (targetStep === 1) {
      for (const { role, prefix } of CONTACTS) {
        const email = (form as any)[`${prefix}Email`]?.trim();
        const phone = (form as any)[`${prefix}Tp`]?.trim();
        if (email && !EMAIL_REGEX.test(email)) {
          errors[`${prefix}Email`] = `Please enter a valid ${role} email.`;
        }
        if (phone && !PHONE_REGEX.test(phone)) {
          errors[`${prefix}Tp`] = `Please enter a valid ${role} telephone.`;
        }
      }
      return {
        fieldErrors: errors,
        formError: Object.keys(errors).length > 0 ? 'Please correct the highlighted fields.' : '',
      };
    }

    if (targetStep === 2) {
      if (!files.businessReg) errors.businessReg = 'Business Registration Document is required.';
      if (customerType === 'tax' && !files.vatDocument) errors.vatDocument = 'VAT Registration Document is required for Tax customers.';
      return {
        fieldErrors: errors,
        formError: Object.keys(errors).length > 0 ? 'Please upload all required documents.' : '',
      };
    }

    if (targetStep === 3 && !confirmed) {
      errors.confirmed = 'Please confirm the declaration before submitting.';
      return {
        fieldErrors: errors,
        formError: 'Please confirm the declaration before submitting.',
      };
    }

    return { fieldErrors: {}, formError: '' };
  };

  const handleSubmit = async () => {
    for (const stepIndex of [0, 1, 2, 3]) {
      const validation = getStepValidation(stepIndex);
      if (Object.keys(validation.fieldErrors).length > 0 || validation.formError) {
        setError(validation.formError || 'Please correct the highlighted fields.');
        setFieldErrors(validation.fieldErrors);
        if (step !== stepIndex) setStep(stepIndex);
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    setFieldErrors({});
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('customerType', customerType === 'tax' ? 'Tax' : 'NonTax');
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (files.businessReg) fd.append('businessRegDoc', files.businessReg);
      if (files.businessAddress) fd.append('businessAddressDoc', files.businessAddress);
      if (files.vatDocument) fd.append('vatDoc', files.vatDocument);
      await customerRegistrationApi.submit(fd);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(false); setStep(0); setConfirmed(false); setCustomerType(''); setError('');
    setFieldErrors({});
    setForm(Object.fromEntries(Object.keys(form).map(k => [k, ''])) as unknown as FormState);
    setFiles({});
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
      >
        <div className="absolute w-[500px] h-[500px] rounded-full animate-pulse-glow"
          style={{ top: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full animate-pulse-glow"
          style={{ bottom: '-10%', right: '-10%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', animationDelay: '1.5s' }} />
        <div className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 text-center px-4 w-full max-w-sm animate-fade-in-scale">
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'rgba(99,102,241,0.12)',
            border: '1.5px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 40px rgba(99,102,241,0.2)',
          }}>
            <svg style={{ width: 44, height: 44, color: '#818cf8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 10, letterSpacing: '-0.5px' }}>
            Registration Submitted!
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 28 }}>
            Your application has been received. Our team will review your details and documents and contact you shortly.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={reset}
              style={{
                padding: '13px 24px', fontSize: 14, fontWeight: 600,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              }}
            >
              Submit Another Application
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '13px 24px', fontSize: 14, fontWeight: 500,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8', borderRadius: 12, cursor: 'pointer',
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
    >
      {/* Background orbs */}
      <div className="absolute w-[600px] h-[600px] rounded-full animate-pulse-glow pointer-events-none"
        style={{ top: '-20%', left: '-15%', background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)' }} />
      <div className="absolute w-[500px] h-[500px] rounded-full animate-pulse-glow pointer-events-none"
        style={{ bottom: '-15%', right: '-10%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', animationDelay: '1.5s' }} />
      <div className="absolute w-[350px] h-[350px] rounded-full animate-pulse-glow pointer-events-none"
        style={{ top: '35%', right: '15%', background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)', animationDelay: '3s' }} />
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 md:py-14" ref={topRef}>

        {/* Page header */}
        <div className="text-center mb-10 animate-fade-in-scale">
          <div className="flex justify-center mb-5">
            <div
              className="inline-flex items-center justify-center w-[68px] h-[68px] rounded-[18px] animate-float"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 8px 32px rgba(99,102,241,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset',
              }}
            >
              <span style={{ color: 'white', fontWeight: 900, fontSize: 26 }}>D</span>
            </div>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px', marginBottom: 2 }}>
            Janasiri <span style={{ color: '#818cf8' }}>Distribution</span>
          </h1>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Pvt Ltd</p>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Customer Registration Application</p>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 999, padding: '5px 14px',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8' }} className="animate-pulse" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Janasiri Distributors
            </span>
          </div>
        </div>

        {/* Form card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 24,
            boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset',
          }}
          className="p-5 sm:p-8 md:p-10"
        >
          <style>{`
            select option { background: #1e293b; }
            input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
          `}</style>

          <StepIndicator current={step} />

          {/* ── Step 0: General ─────────────────────────────────────────── */}
          {step === 0 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 3, height: 20, borderRadius: 2, background: 'linear-gradient(#6366f1,#8b5cf6)', flexShrink: 0 }} />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>General Details</h2>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={LABEL_STYLE}>
                  Customer Type <span style={{ color: '#f87171' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { val: 'non-tax', label: 'Non-Tax Customer', icon: '🏪' },
                    { val: 'tax', label: 'Tax Customer', icon: '🧾' },
                  ].map(({ val, label, icon }) => (
                    <button
                      key={val} type="button" onClick={() => {
                        setCustomerType(val);
                        setFieldErrors((prev) => {
                          if (!prev.customerType) return prev;
                          const next = { ...prev };
                          delete next.customerType;
                          return next;
                        });
                      }}
                      style={{
                        padding: '14px 16px', borderRadius: 14, border: '1.5px solid',
                        borderColor: customerType === val ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)',
                        background: customerType === val ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                        color: customerType === val ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: customerType === val ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
                      }}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                {fieldErrors.customerType && <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 6 }}>{fieldErrors.customerType}</p>}
                {customerType === 'tax' && (
                  <div style={{
                    marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 8,
                    background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
                    borderRadius: 12, padding: '10px 14px',
                  }}>
                    <svg style={{ width: 15, height: 15, color: '#fbbf24', flexShrink: 0, marginTop: 1 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span style={{ fontSize: 12, color: '#fcd34d' }}>
                      VAT registration document will be required in Step 3 (Documents).
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
                <Field label="Customer Name in BR" name="customerName" value={form.customerName} onChange={upd} required error={fieldErrors.customerName} />
                <Field label="Incorporate Date" name="incorporateDate" value={form.incorporateDate} onChange={upd} type="date" />
                <div className="sm:col-span-2">
                  <Field label="Registered Address in BR" name="registeredAddress" value={form.registeredAddress} onChange={upd} />
                </div>
                <Field label="General Business Name" name="businessName" value={form.businessName} onChange={upd} />
                <Field label="Telephone" name="telephone" value={form.telephone} onChange={upd} type="tel" required error={fieldErrors.telephone} />
                <div className="sm:col-span-2">
                  <Field label="Business Location Address" name="businessLocation" value={form.businessLocation} onChange={upd} />
                </div>
                <Field label="Email" name="email" value={form.email} onChange={upd} type="email" required error={fieldErrors.email} />
                <Field label="Operating Bank &amp; Branch" name="bankBranch" value={form.bankBranch} onChange={upd} />
                <SelectField label="Region" name="regionId" value={form.regionId} onChange={upd} required error={fieldErrors.regionId}>
                  <option value="">{regionsLoading ? 'Loading regions...' : 'Select Region'}</option>
                  {(regions || []).map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </SelectField>
                <SelectField label="Sub Region" name="subRegionId" value={form.subRegionId} onChange={upd} disabled={!form.regionId}>
                  <option value="">{subRegionsLoading ? 'Loading sub regions...' : 'Select Sub Region (optional)'}</option>
                  {(subRegions || []).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </SelectField>
                <div className="sm:col-span-2" style={{ marginTop: -4 }}>
                  {regionsLoading && <p style={{ fontSize: 12, color: '#94a3b8' }}>Loading regions...</p>}
                  {regionsError && (
                    <p style={{ fontSize: 12, color: '#fca5a5' }}>
                      Unable to load regions right now.
                      <button type="button" onClick={() => refetchRegions()} style={{ marginLeft: 8, color: '#c7d2fe', textDecoration: 'underline', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        Retry
                      </button>
                    </p>
                  )}
                  {!regionsLoading && !regionsError && (regions?.length || 0) === 0 && (
                    <p style={{ fontSize: 12, color: '#fca5a5' }}>No regions available. Please contact support.</p>
                  )}
                  {!!form.regionId && subRegionsLoading && <p style={{ fontSize: 12, color: '#94a3b8' }}>Loading sub regions...</p>}
                  {!!form.regionId && subRegionsError && (
                    <p style={{ fontSize: 12, color: '#fca5a5' }}>
                      Unable to load sub regions for selected region.
                      <button type="button" onClick={() => refetchSubRegions()} style={{ marginLeft: 8, color: '#c7d2fe', textDecoration: 'underline', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        Retry
                      </button>
                    </p>
                  )}
                </div>
                <Field label="Town" name="town" value={form.town} onChange={upd} placeholder="Enter town name" />
              </div>
            </div>
          )}

          {/* ── Step 1: Professional ────────────────────────────────────── */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 3, height: 20, borderRadius: 2, background: 'linear-gradient(#6366f1,#8b5cf6)', flexShrink: 0 }} />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Professional Details</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {CONTACTS.map(({ role, prefix }) => (
                  <div key={prefix} style={SECTION_CARD_STYLE}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {role}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 12 }}>
                      <div>
                        <label style={LABEL_STYLE}>Name</label>
                        <input type="text" name={`${prefix}Name`} value={(form as any)[`${prefix}Name`]} onChange={upd} placeholder="Full name" style={INPUT_STYLE}
                          onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255,255,255,0.06)'; }} />
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>Telephone</label>
                        <input type="tel" name={`${prefix}Tp`} value={(form as any)[`${prefix}Tp`]} onChange={upd} placeholder="+94..." style={{
                          ...INPUT_STYLE,
                          border: fieldErrors[`${prefix}Tp`] ? '1.5px solid rgba(248, 113, 113, 0.7)' : INPUT_STYLE.border,
                          boxShadow: fieldErrors[`${prefix}Tp`] ? '0 0 0 3px rgba(248, 113, 113, 0.18)' : 'none',
                        }}
                          onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255,255,255,0.06)'; }} />
                        {fieldErrors[`${prefix}Tp`] && <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 6 }}>{fieldErrors[`${prefix}Tp`]}</p>}
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>Email</label>
                        <input type="email" name={`${prefix}Email`} value={(form as any)[`${prefix}Email`]} onChange={upd} placeholder="email@..." style={{
                          ...INPUT_STYLE,
                          border: fieldErrors[`${prefix}Email`] ? '1.5px solid rgba(248, 113, 113, 0.7)' : INPUT_STYLE.border,
                          boxShadow: fieldErrors[`${prefix}Email`] ? '0 0 0 3px rgba(248, 113, 113, 0.18)' : 'none',
                        }}
                          onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(255,255,255,0.06)'; }} />
                        {fieldErrors[`${prefix}Email`] && <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 6 }}>{fieldErrors[`${prefix}Email`]}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Documents ────────────────────────────────────────── */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 3, height: 20, borderRadius: 2, background: 'linear-gradient(#6366f1,#8b5cf6)', flexShrink: 0 }} />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Required Documents</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <FileUpload label="Business Registration Document" name="businessReg" onChange={onFileSet} required error={fieldErrors.businessReg} />
                <FileUpload label="Document to Prove Business Address" name="businessAddress" onChange={onFileSet} />
                {customerType === 'tax' && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: -1, borderRadius: 16, background: 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(99,102,241,0.3))', filter: 'blur(4px)' }} />
                    <div style={{ position: 'relative' }}>
                      <FileUpload label="VAT Registration Document" name="vatDocument" onChange={onFileSet} required error={fieldErrors.vatDocument} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Review ───────────────────────────────────────────── */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 3, height: 20, borderRadius: 2, background: 'linear-gradient(#6366f1,#8b5cf6)', flexShrink: 0 }} />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Review &amp; Confirm</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={SECTION_CARD_STYLE}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>General Information</p>
                  {[
                    ['Customer Type', customerType === 'tax' ? 'Tax Customer' : 'Non-Tax Customer'],
                    ['Customer Name', form.customerName], ['Registered Address', form.registeredAddress],
                    ['Business Name', form.businessName], ['Telephone', form.telephone],
                    ['Email', form.email], ['Bank & Branch', form.bankBranch],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flexShrink: 0, minWidth: 140 }}>{k}</span>
                      <span style={{ fontSize: 13, color: '#cbd5e1', textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={SECTION_CARD_STYLE}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Contact Persons</p>
                  {CONTACTS.filter(({ prefix }) => (form as any)[`${prefix}Name`]).length === 0 ? (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No contacts added</p>
                  ) : CONTACTS.filter(({ prefix }) => (form as any)[`${prefix}Name`]).map(({ role, prefix }) => (
                    <div key={prefix} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ fontSize: 11, color: 'rgba(165,180,252,0.6)', fontWeight: 600, marginBottom: 4 }}>{role}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
                        <span style={{ fontSize: 13, color: '#cbd5e1' }}>{(form as any)[`${prefix}Name`]}</span>
                        {(form as any)[`${prefix}Tp`] && <span style={{ fontSize: 13, color: '#64748b' }}>{(form as any)[`${prefix}Tp`]}</span>}
                        {(form as any)[`${prefix}Email`] && <span style={{ fontSize: 13, color: '#64748b', wordBreak: 'break-all' }}>{(form as any)[`${prefix}Email`]}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={SECTION_CARD_STYLE}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Uploaded Documents</p>
                  {Object.keys(files).length === 0 ? (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No documents uploaded</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(files).map(([key, f]) => f ? (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg style={{ width: 15, height: 15, color: '#818cf8', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span style={{ fontSize: 13, color: '#94a3b8', wordBreak: 'break-all' }}>{f.name}</span>
                        </div>
                      ) : null)}
                    </div>
                  )}
                </div>

                <div
                  onClick={() => {
                    setConfirmed(c => !c);
                    setFieldErrors((prev) => {
                      if (!prev.confirmed) return prev;
                      const next = { ...prev };
                      delete next.confirmed;
                      return next;
                    });
                  }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
                    padding: '14px 16px', borderRadius: 14, border: '1.5px solid',
                    borderColor: fieldErrors.confirmed ? 'rgba(248,113,113,0.8)' : confirmed ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                    background: confirmed ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid',
                    borderColor: confirmed ? '#6366f1' : 'rgba(255,255,255,0.25)',
                    background: confirmed ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                    transition: 'all 0.2s',
                  }}>
                    {confirmed && (
                      <svg style={{ width: 11, height: 11, color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
                    I/We confirm the details given above are <strong style={{ color: '#cbd5e1' }}>true and correct</strong>. I authorize Janasiri Distributors (PVT) Ltd to process this registration.
                  </p>
                </div>
                {fieldErrors.confirmed && <p style={{ fontSize: 12, color: '#fca5a5', marginTop: -4 }}>{fieldErrors.confirmed}</p>}

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', color: '#fca5a5', fontSize: 13 }}>
                    <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {step !== 3 && error && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', color: '#fca5a5', fontSize: 13 }}>
              <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* ── Navigation bar ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', gap: 10 }}>
            <button
              type="button" onClick={goBack} disabled={step === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: step === 0 ? 'rgba(255,255,255,0.2)' : '#94a3b8',
                cursor: step === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              }}
            >
              <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{
                  height: 6, borderRadius: 3, transition: 'all 0.3s',
                  width: i === step ? 22 : 6,
                  background: i === step ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : i < step ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.12)',
                }} />
              ))}
            </div>

            {step < STEPS.length - 1 ? (
              <button
                type="button" onClick={goNext}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                }}
              >
                Next
                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button" onClick={handleSubmit} disabled={submitting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: submitting ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: submitting ? 'rgba(255,255,255,0.2)' : 'white',
                  border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  boxShadow: submitting ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                {submitting ? (
                  <>
                    <svg style={{ width: 16, height: 16 }} className="animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit Registration
                    <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', lineHeight: 1.7 }}>
            No 205 Wattarantenna Passage, Kandy, Sri Lanka · Hotline: 0777-675322 · janasiridistributors@yahoo.com
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            Already registered?{' '}
            <button onClick={() => navigate('/login')} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, padding: 0 }}>
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
