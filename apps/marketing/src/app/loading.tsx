export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 animate-pulse" />
        <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-950 flex items-center justify-center">
          <div className="h-3 w-3 bg-brand-500 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
