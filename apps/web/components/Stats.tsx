import { getPublicSummary } from '@/lib/public-directory';

export default async function Stats() {
  let summary = { publishedClinicCount: 0, publishedDentistCount: 0 };
  try { summary = await getPublicSummary(); } catch { /* Public counts gracefully fall back during API downtime. */ }
  const stats = [
    { value: String(summary.publishedClinicCount), label: 'Published Clinics' },
    { value: String(summary.publishedDentistCount), label: 'Verified Dentists' },
    { value: 'Beta', label: 'Now Open for Early Clinics' },
    { value: 'PH-Built', label: 'Designed for Philippine Dentists' },
  ];
  return (
    <section className="py-14 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-violet-600 rounded-4xl px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl sm:text-4xl font-extrabold mb-1">{s.value}</p>
              <p className="text-violet-200 text-sm font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
