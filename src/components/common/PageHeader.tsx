import React from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ActionItem {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  /** Accepts ReactNode for full custom actions OR an array of ActionItem objects */
  actions?: React.ReactNode | ActionItem[];
}

function isActionArray(v: any): v is ActionItem[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0].label === 'string';
}

const variantClasses: Record<string, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

export default function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  const renderActions = () => {
    if (!actions) return null;
    if (!isActionArray(actions)) return actions;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${variantClasses[a.variant || 'primary']}`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {a.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        {backTo && (
          <button onClick={() => navigate(backTo)} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {renderActions()}
    </div>
  );
}
