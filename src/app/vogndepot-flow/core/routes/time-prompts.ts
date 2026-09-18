export function promptTime(label: string): string | null {
  const input = window.prompt(label, '08:00');
  if (!input) return null;
  const trimmed = input.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    window.alert('Indtast tid som HH:mm (00-23:59).');
    return null;
  }
  return trimmed;
}
