export default function Suspended({ searchParams }: { searchParams: { until?: string; reason?: string } }) {
  const until = searchParams.until ? new Date(searchParams.until) : null;
  return (
    <section className="max-w-xl pb-24 pr-6 pt-32">
      <h1 className="mb-6 text-4xl font-black tracking-tight md:text-6xl">Account suspended</h1>
      <p className="text-xl text-slate7">
        Your account has been temporarily suspended{until && !isNaN(until.getTime()) ? ` until ${until.toLocaleString()}` : ""}.
        You can still browse the site, but writing, commenting and account settings are unavailable until then.
      </p>
      {searchParams.reason && (
        <p className="mt-4 border-l-4 border-gold pl-3" dir="auto"><b>Reason given:</b> {searchParams.reason}</p>
      )}
      <p className="mt-4 text-slate7">If you think this is a mistake, contact an admin or editor.</p>
    </section>
  );
}
