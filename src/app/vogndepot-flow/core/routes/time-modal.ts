export function promptTimeAtCursor(clientX: number, clientY: number, label: string): Promise<string | null> {
  return new Promise(resolve => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = `${clientX}px`;
    container.style.top = `${clientY}px`;
    container.style.transform = 'translate(-10px, -10px)';
    container.style.background = '#0f172a';
    container.style.color = '#e2e8f0';
    container.style.border = '1px solid #1e293b';
    container.style.borderRadius = '6px';
    container.style.padding = '10px';
    container.style.zIndex = '10000';
    container.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
    container.style.fontFamily = 'sans-serif';
    container.style.minWidth = '180px';

    const title = document.createElement('div');
    title.textContent = label;
    title.style.marginBottom = '8px';
    title.style.fontSize = '12px';
    container.appendChild(title);

    const input = document.createElement('input');
    input.type = 'time';
    input.value = '08:00';
    input.style.width = '100%';
    input.style.padding = '6px';
    input.style.border = '1px solid #334155';
    input.style.borderRadius = '4px';
    input.style.background = '#111827';
    input.style.color = '#e2e8f0';
    container.appendChild(input);

    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.justifyContent = 'flex-end';
    buttons.style.gap = '8px';
    buttons.style.marginTop = '10px';

    const ok = document.createElement('button');
    ok.textContent = 'OK';
    ok.style.padding = '6px 10px';
    ok.style.background = '#2563eb';
    ok.style.color = '#fff';
    ok.style.border = 'none';
    ok.style.borderRadius = '4px';
    ok.style.cursor = 'pointer';

    const cancel = document.createElement('button');
    cancel.textContent = 'Annuller';
    cancel.style.padding = '6px 10px';
    cancel.style.background = '#334155';
    cancel.style.color = '#e2e8f0';
    cancel.style.border = 'none';
    cancel.style.borderRadius = '4px';
    cancel.style.cursor = 'pointer';

    buttons.appendChild(cancel);
    buttons.appendChild(ok);
    container.appendChild(buttons);
    document.body.appendChild(container);

    const cleanup = () => {
      container.remove();
    };

    const finish = (val: string | null) => {
      cleanup();
      resolve(val);
    };

    ok.onclick = () => {
      const val = input.value;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(val)) {
        alert('Indtast tid som HH:mm (00-23:59).');
        return;
      }
      finish(val);
    };
    cancel.onclick = () => finish(null);

    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        ok.click();
      }
      if (e.key === 'Escape') {
        cancel.click();
      }
    };

    input.focus();
  });
}
