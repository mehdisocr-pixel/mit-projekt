// stedparser.ts
export function splitSted(stedString: string) {
    // Samme logik som tidligere
    if (!stedString) {
      return {
        afsnitsnr: '', afsnitsnavn: '', rumnavn: '', opgang: '', etage: '', afsnit: ''
      };
    }
    const match = stedString.match(/^(\d{4})\s+(.+)$/);
    if (match) {
      const afsnitsnr = match[1];
      const resten = match[2];
      const rumMatch = resten.match(/^(.+)\s+([^\s]+.*)$/);
      const afsnitsnavn = rumMatch ? rumMatch[1] : resten;
      const rumnavn = rumMatch ? rumMatch[2] : '';
      const opgang = afsnitsnr[0];
      const etage = afsnitsnr[1] === '0' ? 'Stue' : `${afsnitsnr[1]}. sal`;
      const afsnit = afsnitsnr[2];
      return { afsnitsnr, afsnitsnavn, rumnavn, opgang, etage, afsnit };
    }
    return {
      afsnitsnr: '', afsnitsnavn: '', rumnavn: '', opgang: '', etage: '', afsnit: ''
    };
  }
  