import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemConfigApi } from '../services/api/systemConfigApi';

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

type TrialStatus = 'idle' | 'running' | 'paused' | 'expired';

export function formatTrialTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const dayLabel = `${days}d`;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${dayLabel} ${hh}:${mm}:${ss}`;
}

export function useTrialCountdown() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());

  const { data: config } = useQuery({
    queryKey: ['system-config-branding'],
    queryFn: () => systemConfigApi.getConfig().then((r) => r.data.data || r.data),
    staleTime: 0,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const updateTrialMut = useMutation({
    mutationFn: (trialAction: 'start' | 'pause' | 'reset') => systemConfigApi.updateConfig({ trialAction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config-branding'] });
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
    },
  });

  const initialRemainingMs = Math.max(0, Number(config?.trialRemainingSeconds || 0) * 1000);
  const isRunning = !!config?.isTrialRunning;
  const trialEndMs = config?.trialEndsAtUtc ? Date.parse(config.trialEndsAtUtc as string) : NaN;

  const timeLeftMs = useMemo(() => {
    if (isRunning && Number.isFinite(trialEndMs)) {
      return Math.max(0, trialEndMs - now);
    }
    return initialRemainingMs;
  }, [isRunning, trialEndMs, now, initialRemainingMs]);

  const isExpired = timeLeftMs <= 0;

  const status: TrialStatus = useMemo(() => {
    if (isRunning) return 'running';
    if (isExpired) return 'expired';
    const hasStarted = initialRemainingMs < TRIAL_DURATION_MS;
    return hasStarted ? 'paused' : 'idle';
  }, [isRunning, isExpired, initialRemainingMs]);

  const start = useCallback(() => {
    updateTrialMut.mutate('start');
  }, [updateTrialMut]);

  const pause = useCallback(() => {
    updateTrialMut.mutate('pause');
  }, [updateTrialMut]);

  const reset = useCallback(() => {
    updateTrialMut.mutate('reset');
  }, [updateTrialMut]);

  return {
    status,
    timeLeftMs,
    isRunning,
    isExpired,
    formattedTime: formatTrialTime(timeLeftMs),
    start,
    pause,
    reset,
  };
}
