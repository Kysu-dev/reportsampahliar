import { LandingHeader } from '@/components/landing/LandingHeader';
import { EducationContent } from '@/components/education/EducationContent';

export default function EdukasiPage() {
  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.2),transparent_32%),radial-gradient(circle_at_92%_6%,rgba(59,130,246,0.16),transparent_34%),linear-gradient(180deg,#f3f8f4,#edf4f1_48%,#edf6f3)]'>
      <div className='mx-auto max-w-[1360px] px-2 py-6 sm:px-4 lg:px-6'>
        <div className='overflow-hidden rounded-[30px] bg-white/90 shadow-[0_28px_60px_-36px_rgba(11,28,48,0.55)] ring-1 ring-emerald-100'>
          <LandingHeader activeNav='education' />
          <EducationContent />
        </div>
      </div>
    </main>
  );
}
