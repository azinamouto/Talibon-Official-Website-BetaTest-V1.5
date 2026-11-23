import { useState, type ReactNode } from 'react';

const logos = import.meta.glob<string>('../assets/images/barangays/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export default function BarangayLogo({ name, className, fallback = null }: {
  name: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
  const src = logos[`../assets/images/barangays/${slug}.png`];
  const [failedSrc, setFailedSrc] = useState<string>();

  if (!src || src === failedSrc) return <>{fallback}</>;

  return <img src={src} alt={`Barangay ${name} official seal`} className={className}
    width={500} height={500} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} />;
}
