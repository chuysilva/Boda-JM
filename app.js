"use strict";
// Galería: 7 segundos, swipe, teclado y barra minimalista.
(() => {
  const track = document.getElementById('galeriaTrack');
  const gallery = document.querySelector('.gallery');
  const progress = document.getElementById('progresoFotos');
  const count = track.children.length;
  const duration = 7000;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = 0, timer = null, startX = null;
  const stop = () => { if(timer !== null) clearTimeout(timer); timer = null; };
  function schedule() {
    stop();
    if (!document.hidden && !reduced && count > 1) {
      progress.style.animation = 'none';
      void progress.offsetWidth;
      progress.style.animation = `galleryFill ${duration}ms linear both`;
      timer = setTimeout(() => show(active + 1), duration);
    }
  }
  function show(n) {
    active = (n + count) % count;
    track.style.transform = `translateX(-${active * 100}%)`;
    schedule();
  }
  gallery.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive:true});
  gallery.addEventListener('touchend', e => {
    if (startX === null) return;
    const delta = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(delta) > 35) show(active + (delta < 0 ? 1 : -1));
  }, {passive:true});
  gallery.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); show(active + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) { stop(); progress.style.animationPlayState='paused'; }
    else { progress.style.animationPlayState='running'; schedule(); }
  });
  show(0);
})();

// Consultar / guardar RSVP por la API del Worker.
(() => {
  const token = new URLSearchParams(location.search).get('t') || '';
  const api = (window.BODA_CONFIG?.API_BASE || '').replace(/\/$/, '');
  const loading = document.getElementById('cargando');
  const content = document.getElementById('contenido');
  const error = document.getElementById('error');
  const message = document.getElementById('mensaje');
  const button = document.getElementById('guardar');
  const select = document.getElementById('cantidad');
  const noun = n => n === 1 ? 'persona' : 'personas';
  const invalid = text => { loading.style.display='none'; error.textContent=text; };
  const request = async (path, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(api + path, { ...options, signal: controller.signal, cache:'no-store' });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || 'No se pudo conectar. Intenta más tarde.');
      return result;
    } finally { clearTimeout(timer); }
  };
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    invalid('Abre el enlace personal que recibiste por WhatsApp para confirmar tu asistencia.'); return;
  }
  if (!/^https:\/\//.test(api)) {
    invalid('El sistema de confirmación está en preparación. La galería ya está disponible.'); return;
  }
  (async () => {
    try {
      const result = await request('/api/invitacion?t=' + encodeURIComponent(token));
      const data = result.invitacion;
      document.getElementById('nombre').textContent = data.nombre;
      document.getElementById('reserva').textContent = data.cupos === 1
        ? 'Hemos reservado 1 lugar para ti.'
        : `Hemos reservado ${data.cupos} lugares para ustedes.`;
      select.replaceChildren();
      for(let i=0; i<=data.cupos; i++) {
        const o = document.createElement('option'); o.value = String(i);
        o.textContent = i===0 ? 'No asistiré / no asistiremos' : `${i} ${noun(i)}`;
        select.appendChild(o);
      }
      select.value = String(data.confirmados === null ? data.cupos : data.confirmados);
      if(data.confirmados !== null) message.textContent = data.confirmados === 0
        ? 'Última respuesta: no asistirán.'
        : `Última respuesta: ${data.confirmados} ${noun(data.confirmados)}.`;
      loading.style.display = 'none'; content.style.display = 'block';
    } catch(e) { invalid(e.message || 'No se pudo abrir la invitación.'); }
  })();
  button.addEventListener('click', async () => {
    const cantidad = Number(select.value);
    button.disabled = true; message.textContent = 'Guardando tu respuesta…';
    try {
      const response = await request('/api/confirmar', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ token, cantidad })
      });
      message.textContent = response.confirmados === 0
        ? 'Respuesta guardada. ¡Gracias por avisarnos!'
        : `¡Gracias! Quedaron confirmadas ${response.confirmados} ${noun(response.confirmados)}.`;
    } catch(e) { message.textContent = e.message || 'No se pudo guardar. Intenta otra vez.'; }
    finally { button.disabled=false; }
  });
})();

// Audio: intentar al abrir; pausar al salir y reanudar al volver.
// Restricción del navegador: no se garantiza autoplay con sonido sin gesto del usuario.
(() => {
  const audio = document.getElementById('musicaBoda');
  audio.volume = 0.35;
  let requesting = false, activated = false, wasPlaying = false, inFocus = true;
  async function play() {
    if (document.hidden || !inFocus || requesting || !audio.paused) return;
    requesting = true;
    try { await audio.play(); activated = true; removeUnlock(); }
    catch(e) { /* navegador requiere gesto */ }
    finally {
      requesting=false;
      if(document.hidden || !inFocus) { wasPlaying ||= !audio.paused; audio.pause(); }
    }
  }
  function removeUnlock() {
    document.removeEventListener('pointerdown',play);
    document.removeEventListener('touchstart',play);
    document.removeEventListener('keydown',play);
  }
  document.addEventListener('pointerdown',play);
  document.addEventListener('touchstart',play,{passive:true});
  document.addEventListener('keydown',play);
  function pause() { wasPlaying ||= !audio.paused; audio.pause(); }
  function resume() {
    if(document.hidden || !inFocus) return;
    if(wasPlaying || !activated) play();
    wasPlaying=false;
  }
  document.addEventListener('visibilitychange',()=> document.hidden?pause():resume());
  window.addEventListener('pagehide',pause);
  window.addEventListener('pageshow',resume);
  window.addEventListener('blur',()=>{inFocus=false;pause();});
  window.addEventListener('focus',()=>{inFocus=true;resume();});
  play();
})();
