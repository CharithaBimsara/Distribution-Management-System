import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  MapPin,
  ShoppingCart,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { repsApi } from '../../services/api/repsApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { SalesTarget } from '../../types/common.types';

export default function RepDashboard() {
  const navigate = useNavigate();

  const { data: targets = [], isFetching: targetsFetching } = useQuery({
    queryKey: ['rep-targets'],
    queryFn: () => repsApi.repGetTargets().then((response) => response.data.data),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: profile } = useQuery({
    queryKey: ['rep-profile'],
    queryFn: () => repsApi.repGetProfile().then((response) => response.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const currentTarget = useMemo(() => {
    if (!targets.length) return undefined;

    const now = new Date();
    const sortedTargets = [...targets].sort(
      (first: SalesTarget, second: SalesTarget) =>
        new Date(second.startDate).getTime() -
        new Date(first.startDate).getTime(),
    );

    return (
      sortedTargets.find(
        (target: SalesTarget) =>
          new Date(target.startDate) <= now &&
          now <= new Date(target.endDate),
      ) ?? sortedTargets[0]
    );
  }, [targets]);

  const targetAmount = currentTarget?.targetAmount ?? 0;
  const actualSales = currentTarget?.achievedAmount ?? 0;
  const remainingAmount = Math.max(targetAmount - actualSales, 0);
  const exceededBy = Math.max(actualSales - targetAmount, 0);
  const achievement = currentTarget?.achievementPercentage ?? 0;
  const progressWidth = Math.min(Math.max(achievement, 0), 100);

  const invoiceCount = currentTarget?.distinctOrderCount ?? 0;
  const customerCount = currentTarget?.distinctCustomerCount ?? 0;
  const averageInvoice = invoiceCount > 0 ? actualSales / invoiceCount : 0;

  const statusLabel =
    currentTarget?.performanceStatus ??
    (achievement >= 100
      ? 'Target Achieved'
      : achievement >= 75
        ? 'On Track'
        : 'Below Target');

  return (
    <div className="mx-auto w-full max-w-[1600px] animate-fade-in space-y-4 px-3 pb-8 pt-2 sm:space-y-5 sm:px-5 sm:pt-4 xl:space-y-6 xl:px-8 xl:pt-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-full break-words text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
            Good {getGreeting()},{' '}
            <span className="text-emerald-700">
              {profile?.fullName || 'Sales Rep'}
            </span>
          </h1>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            Current target performance overview
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <div className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm sm:w-auto">
            <CalendarDays className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <span className="min-w-0 break-words">
              {currentTarget
                ? `${formatDate(currentTarget.startDate)} – ${formatDate(
                    currentTarget.endDate,
                  )}`
                : 'No active period'}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile compact summary — full-width amounts with no clipping */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-600">Current Target</p>
            {currentTarget && (
              <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
                {formatDate(currentTarget.startDate)} –{' '}
                {formatDate(currentTarget.endDate)}
              </p>
            )}
          </div>

          <span
            className={`inline-flex flex-shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-bold ${
              achievement >= 100
                ? 'bg-emerald-100 text-emerald-700'
                : achievement >= 75
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-amber-100 text-amber-700'
            }`}
          >
            {achievement.toFixed(1)}%
          </span>
        </div>

        <div className="px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Actual Sales
          </p>

          <div className="mt-1 flex min-w-0 items-baseline gap-1.5">
            <span className="flex-shrink-0 text-xs font-bold text-emerald-700">
              LKR
            </span>
            <span className="min-w-0 break-words text-[clamp(1.45rem,7vw,2rem)] font-extrabold leading-tight tracking-tight text-slate-950 [overflow-wrap:anywhere]">
              {formatAmountNumber(actualSales)}
            </span>
          </div>

          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <span className="flex-shrink-0 text-xs font-semibold text-slate-500">
              Target
            </span>
            <span className="min-w-0 break-words text-right text-sm font-bold leading-5 text-slate-800 [overflow-wrap:anywhere]">
              LKR {formatAmountNumber(targetAmount)}
            </span>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-700"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>
      </section>

      {/* Main responsive layout:
          - Mobile: one column
          - Tablet: main card full width, secondary cards below in 3 columns
          - Desktop: 8/4 bento layout */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-12 xl:gap-6">
        {/* Main Target Progress Card */}
        <section className="order-1 hidden relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block xl:col-span-8">
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-50 blur-3xl sm:h-64 sm:w-64" />

          <div className="relative p-4 sm:p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Target Progress
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                  Sales against the current target period
                </p>
              </div>

              <span
                className={`inline-flex w-fit flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                  achievement >= 100
                    ? 'bg-emerald-100 text-emerald-700'
                    : achievement >= 75
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {achievement >= 100 ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Target className="h-3.5 w-3.5" />
                )}
                {statusLabel}
              </span>
            </div>

            {/* Amounts: stack on mobile so large currency text never clips */}
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Actual Sales
                </p>
                <p className="mt-1 break-words text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-[42px]">
                  {formatCurrency(actualSales)}
                </p>
              </div>

              <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 sm:max-w-[260px] sm:bg-transparent sm:px-0 sm:py-0 sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Target
                </p>
                <p className="mt-1 break-words text-base font-bold text-slate-700 sm:text-lg">
                  {formatCurrency(targetAmount)}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-5">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                    achievement >= 100
                      ? 'bg-gradient-to-r from-emerald-500 to-lime-400'
                      : achievement >= 75
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  }`}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">
                  {achievement.toFixed(1)}% achieved
                </p>
                {currentTarget?.hasReport && currentTarget.reportAsAtDate && (
                  <p className="text-right text-[11px] text-slate-400">
                    As at {formatDate(currentTarget.reportAsAtDate)}
                  </p>
                )}
              </div>
            </div>

            {/* Sub Metrics:
                - 2 columns mobile
                - 3 columns tablet and desktop */}
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">
              <SubMetric
                label={exceededBy > 0 ? 'Exceeded By' : 'Remaining'}
                value={formatCurrency(
                  exceededBy > 0 ? exceededBy : remainingAmount,
                )}
                fullWidthOnSmall
              />
              <SubMetric
                label="Invoices"
                value={invoiceCount.toLocaleString('en-US')}
              />
              <SubMetric
                label="Latest Report"
                value={
                  currentTarget?.hasReport && currentTarget.reportAsAtDate
                    ? formatDate(currentTarget.reportAsAtDate)
                    : 'Not uploaded'
                }
              />
            </div>

            {!currentTarget && !targetsFetching && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium leading-5 text-amber-700">
                No target has been configured yet.
              </div>
            )}
          </div>
        </section>

        {/* Secondary column:
            Tablet uses 3-column balanced layout.
            Desktop returns to vertical side column. */}
        <div className="order-3 hidden grid-cols-2 gap-4 md:order-2 md:grid md:grid-cols-3 xl:col-span-4 xl:grid-cols-2 xl:gap-4">
          {/* Achievement card */}
          <section className="relative col-span-2 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-4 text-white shadow-lg shadow-emerald-600/10 md:col-span-1 md:p-5 xl:col-span-2 xl:p-6">
            <div className="pointer-events-none absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <Trophy className="h-5 w-5 text-emerald-100 sm:h-6 sm:w-6" />
                  <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold backdrop-blur-sm sm:text-xs">
                    {achievement >= 100
                      ? 'Excellent'
                      : achievement >= 75
                        ? 'Good'
                        : 'Needs Focus'}
                  </span>
                </div>

                <p className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
                  {achievement.toFixed(0)}%
                </p>
                <p className="mt-1 text-xs text-emerald-100 sm:text-sm">
                  Target Achievement
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/rep/performance')}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-emerald-700 transition active:scale-[0.99] sm:hover:bg-emerald-50"
              >
                Performance
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <MiniStatCard
            icon={Users}
            label="Customers"
            value={customerCount.toLocaleString('en-US')}
            color="blue"
          />
          <MiniStatCard
            icon={Zap}
            label="Avg. Invoice"
            value={formatCurrency(averageInvoice)}
            color="amber"
          />
        </div>

        {/* Quick Actions */}
        <section className="order-1 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-5 md:order-3 md:p-6 xl:col-span-12">
          <div className="mb-3 sm:mb-5">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              Quick Actions
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <QuickActionButton
              title="New Order"
              icon={ShoppingCart}
              onClick={() => navigate('/rep/orders/new')}
              primary
            />
            <QuickActionButton
              title="Customers"
              icon={Users}
              onClick={() => navigate('/rep/customers')}
            />
            <QuickActionButton
              title="Quotations"
              icon={FileText}
              onClick={() => navigate('/rep/quotations')}
            />
            <QuickActionButton
              title="My Routes"
              icon={MapPin}
              onClick={() => navigate('/rep/routes')}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SubMetric({
  label,
  value,
  fullWidthOnSmall = false,
}: {
  label: string;
  value: string;
  fullWidthOnSmall?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl bg-slate-50 p-3 ${
        fullWidthOnSmall ? 'col-span-2 md:col-span-1' : ''
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold leading-5 text-slate-900 sm:text-base">
        {value}
      </p>
    </div>
  );
}

function MiniStatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  color: 'blue' | 'amber';
}) {
  const colors =
    color === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : 'bg-amber-50 text-amber-600';

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-lg font-bold leading-6 text-slate-900">
        {value}
      </p>
    </article>
  );
}

function QuickActionButton({
  title,
  icon: Icon,
  onClick,
  primary = false,
}: {
  title: string;
  icon: typeof ShoppingCart;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[88px] min-w-0 flex-col items-start justify-between rounded-xl border p-3 text-left transition active:scale-[0.98] sm:min-h-[112px] sm:p-4 md:min-h-0 md:flex-row md:items-center md:gap-3 ${
        primary
          ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/10 sm:hover:bg-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-900 sm:hover:border-emerald-200 sm:hover:bg-emerald-50/50'
      }`}
    >
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${
          primary
            ? 'bg-white/20 text-white'
            : 'border border-slate-100 bg-white text-emerald-600 shadow-sm'
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex min-w-0 w-full items-end justify-between gap-2 md:items-center">
        <p className="min-w-0 break-words text-sm font-bold leading-5">
          {title}
        </p>
        <ArrowRight
          className={`h-4 w-4 flex-shrink-0 transition-transform sm:group-hover:translate-x-0.5 ${
            primary ? 'text-white/80' : 'text-slate-400'
          }`}
        />
      </div>
    </button>
  );
}

function formatAmountNumber(value: number) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}