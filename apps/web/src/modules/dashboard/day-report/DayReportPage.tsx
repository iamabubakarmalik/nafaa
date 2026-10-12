import { PageHeader } from '@/design-system/components';
import { DayReportView } from './DayReportView';

export default function DayReportPage() {
  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-4 pb-10">
      <PageHeader title="Din ka hisaab" description="Opening se closing tak — har item, har payment, har kharcha" />
      <DayReportView full />
    </div>
  );
}
