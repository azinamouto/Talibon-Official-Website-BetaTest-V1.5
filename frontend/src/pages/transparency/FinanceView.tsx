import PublishedAttachments from '../../components/PublishedAttachments';
import type { PublicAttachment } from '../../services/publicApi';
import layout from "../../styles/InnerPageLayout.module.css";
import React from "react";

interface Report {
  description?: string;
  attachments?: PublicAttachment[];
  id: string;
  title: string;
  url: string;
}

interface FinanceViewProps {
  data: Report[];
}

export default function FinanceView({ data }: FinanceViewProps) {
  return (
    <div className={layout.reports}>
      {Array.isArray(data) && data.map((report: Report, idx: number) => (
        <article key={`${report.id}-${idx}`} className="space-y-3 p-3.5 sm:p-4 rounded-xl border border-brand-border bg-white shadow-xs group hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-bold text-brand-text group-hover:text-brand-primary transition-colors font-display uppercase tracking-tight">
            {String(report.title)}
          </span>
          <span className="text-[9px] font-bold text-brand-primary uppercase tracking-wider bg-brand-primary/10 px-3 py-1 rounded-full shrink-0">
            OFFICIAL REPORT
          </span>
          </div>
          {report.description && <p className="whitespace-pre-wrap text-brand-muted">{report.description}</p>}
          <PublishedAttachments attachments={report.attachments} />
          {!report.attachments?.length && <a href={report.url} className="underline min-h-11">View report</a>}
        </article>
      ))}
    </div>
  );
}
