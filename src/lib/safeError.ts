export function getSafeErrorMessage(
  error: unknown,
  fallback: string = 'Ocorreu um erro inesperado.'
): string {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? fallback)
      : fallback;

  const lower = message.toLowerCase();

  // Avoid leaking authorization/RLS details to end users.
  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('not authorized') ||
    lower.includes('unauthorized') ||
    lower.includes('jwt')
  ) {
    return 'Operação não autorizada.';
  }

  // Avoid leaking long internal details.
  if (message.length > 180) return `${message.slice(0, 177)}...`;

  return message;
}
