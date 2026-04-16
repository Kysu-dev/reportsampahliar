'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroShowcase } from '@/components/landing/HeroShowcase';
import { LandingReportForm } from '@/components/landing/LandingReportForm';
import { LandingRightRail } from '@/components/landing/LandingRightRail';
import { Toaster_ } from '@/components/ui/toaster';
import { reportService } from '@/lib/api';
import type { Report } from '@/types';

export default function HomePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const data = await reportService.getReports();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const heroStats = useMemo(() => {
    if (reports.length === 0) {
      return {
        totalReports: 500,
        activeWorkers: 100,
      };
    }

    const inProgressReports = reports.filter((report) => report.status === 'in-progress').length;
    const activeWorkers = Math.max(24, inProgressReports * 4);

    return {
      totalReports: reports.length,
      activeWorkers,
    };
  }, [reports]);

  return (
    <>
      <main className='min-h-screen bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.2),transparent_32%),radial-gradient(circle_at_92%_6%,rgba(59,130,246,0.16),transparent_34%),linear-gradient(180deg,#f3f8f4,#edf4f1_48%,#edf6f3)]'>
        <div className='mx-auto max-w-[1360px] px-2 py-6 sm:px-4 lg:px-6'>
          <div className='overflow-hidden rounded-[30px] bg-white/90 shadow-[0_28px_60px_-36px_rgba(11,28,48,0.55)] ring-1 ring-emerald-100'>
            <LandingHeader activeNav='home' />

            <div className='grid xl:grid-cols-[1.2fr_0.8fr]'>
              <div>
                <HeroShowcase
                  totalReports={heroStats.totalReports}
                  activeWorkers={heroStats.activeWorkers}
                />
                <div className='px-4 pb-10 sm:px-8 sm:pb-12'>
                  <LandingReportForm onSuccess={loadReports} />
                </div>
              </div>

              <LandingRightRail reports={reports} isLoading={isLoadingReports} />
            </div>
          </div>
        </div>
      </main>

      <Toaster_ />
    </>
  );
}