/** The message to show for a failed API call: the server's message when it sent one. */
export function apiError(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  const x = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = x?.response?.data?.message;
  return (Array.isArray(m) ? m.join(', ') : m) || fallback;
}
