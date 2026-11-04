/* Lifeisgood adapter. Upstream UMD remains unmodified. Each iframe owns one wheel. */
(() => {
  let wheel, id, options, busy = false;
  const send = (type, payload = {}) => parent.postMessage({ tool: 'daily-wheel', id, type, ...payload }, location.origin);
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.tool !== 'daily-wheel') return;
    const data = event.data;
    if (data.type === 'init' && !wheel) {
      if (!Array.isArray(data.options) || data.options.length < 2 || data.options.length > 20 || !data.options.every(x => typeof x === 'string' && Array.from(x).length <= 24)) return;
      if (typeof globalThis.LuckyCanvas?.LuckyWheel !== 'function') return;
      id = data.id; options = data.options;
      wheel = new LuckyCanvas.LuckyWheel('#wheel', {
        width: 300, height: 300,
        blocks: [{ padding: '5px', background: '#285b40' }],
        prizes: options.map((text, index) => ({ index, background: ['#e0eddb', '#fff0c7', '#dcebf2', '#f1ded8'][index % 4], fonts: [{ text: options.length > 8 ? String(index + 1) : `${index + 1} ${Array.from(text).slice(0, 6).join('')}${Array.from(text).length > 6 ? '…' : ''}`, top: '12px', fontSize: options.length > 12 ? '12px' : '13px', fontColor: '#20382c', lineClamp: 2 }] })),
        buttons: [{ radius: '28px', background: '#285b40', pointer: true, fonts: [{ text: '选择', top: '-8px', fontSize: '14px', fontColor: '#ffffff' }] }],
        defaultConfig: { accelerationTime: 400, decelerationTime: 1300, speed: 16, stopRange: 0 },
        defaultStyle: { fontStyle: 'system-ui, sans-serif', wordWrap: false },
        end(prize) {
          if (!busy) return;
          busy = false;
          // Published 1.7.26 draws sector i from rotation + i*sector to rotation +(i+1)*sector, relative to top.
          const angle = ((-wheel.rotateDeg % 360) + 360) % 360;
          const landedIndex = Math.floor(angle / (360 / options.length)) % options.length;
          send('result', { index: prize.index, landedIndex, rotation: wheel.rotateDeg });
        }
      });
      requestAnimationFrame(() => send('ready'));
    } else if (data.type === 'spin' && data.id === id && wheel && !busy) {
      busy = true;
      const index = Math.floor(Math.random() * options.length);
      wheel.play(); wheel.stop(index);
    }
  });
  send('boot');
})();
