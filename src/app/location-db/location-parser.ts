export interface ParsedLocationDetails {
  afsnitsnr: string;
  opgang: string;
  etage: string;
  afsnit: string;
}

const OPGANGE_SET = new Set<number>([
  2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 39, 41, 42, 44, 45, 54, 55, 56, 57, 58,
  62, 75, 76, 85, 86, 87, 93, 94, 95, 99,
]);

export function parseLocationDetails(lokation: string | undefined | null): ParsedLocationDetails | null {
  const match = (lokation ?? '').match(/(\d{4})/);
  if (!match) return null;
  const afsnitsnr = match[1];
  const A = afsnitsnr.substring(0, 1);
  const AB = parseInt(afsnitsnr.substring(0, 2), 10);
  const B = afsnitsnr.substring(1, 2);
  const C = afsnitsnr.substring(2, 3);
  const BC = afsnitsnr.substring(1, 3);
  const D = afsnitsnr.substring(3, 4);

  let opgang = '';
  let etage = '';
  const afsnit = D;

  if (OPGANGE_SET.has(AB)) {
    opgang = String(AB);
    etage = etageFromSingleDigit(C);
  } else {
    opgang = A;
    if (A === '2' || A === '3') {
      etage = etageFromTwoDigits(BC);
    } else {
      etage = etageFromSingleDigit(B);
    }
  }

  return { afsnitsnr, opgang, etage, afsnit };
}

function etageFromSingleDigit(code: string): string {
  if (code === '0') return 'Stue';
  if (/^[1-7]$/.test(code)) return `${parseInt(code, 10)}. sal`;
  if (code === '8') return 'Underkaelder';
  if (code === '9') return 'Kaelder';
  return '';
}

function etageFromTwoDigits(code: string): string {
  if (code === '00') return 'Stue';
  if (/^(0[1-9]|1[0-6])$/.test(code)) return `${parseInt(code, 10)}. sal`;
  if (code === '18') return 'Underkaelder';
  if (code === '19') return 'Kaelder';
  return '';
}
