import PublishedAttachments from '../../components/PublishedAttachments';
import type { PublicAttachment } from '../../services/publicApi';
import React from "react";

interface MandateData {
  content: string;
  attachments?: PublicAttachment[];
}

interface MandateViewProps {
  data: MandateData;
}

export default function MandateView({ data }: MandateViewProps) {
  return (
    <><p className="text-lg text-brand-muted leading-relaxed font-medium">
      {data.content}
    </p><PublishedAttachments attachments={data.attachments} /></>
  );
}
