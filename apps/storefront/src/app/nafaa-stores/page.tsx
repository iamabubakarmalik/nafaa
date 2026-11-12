/** Shown on the bare root domain or when no shop matches the host. */
export default function NafaaStores() {
  return (
    <main className="grid min-h-screen place-items-center bg-neutral-50 px-6 text-center">
      <div>
        <p className="text-3xl font-bold tracking-tight text-neutral-900">Nafaa Stores</p>
        <p className="mt-2 text-neutral-600">Online stores for Pakistani sellers, run from Nafaa.</p>
        <a href="https://nafaa.pk" className="mt-6 inline-block rounded-lg bg-neutral-900 px-5 py-3 font-semibold text-white">
          Visit nafaa.pk
        </a>
      </div>
    </main>
  );
}
