(function () {
  'use strict';

  // Utility: safe access to existing functions/vars on the page
  const has = (name) => typeof window[name] !== 'undefined';

  // Ensure audio context is resumed on a user gesture
  function resumeAudioOnUserGesture() {
    const resumeOnce = () => {
      try {
        if (has('ensureAudioContext')) {
          // call the existing helper if present
          window.ensureAudioContext();
        } else if (window.AudioContext || window.webkitAudioContext) {
          // otherwise try a minimal resume
          const ctx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
          if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
            ctx.resume().catch(() => {});
          }
        }
      } catch (e) {
        // non-fatal; silently ignore
      } finally {
        document.removeEventListener('click', resumeOnce);
        document.removeEventListener('keydown', resumeOnce);
      }
    };

    document.addEventListener('click', resumeOnce, { once: true, passive: true });
    document.addEventListener('keydown', resumeOnce, { once: true, passive: true });
  }

  // Inject a small Test Tick button next to existing tick controls (non-invasive)
  function injectTestTickButton() {
    const tickPitch = document.getElementById('tick-pitch');
    const tickVolume = document.getElementById('tick-volume');
    const tickProfile = document.getElementById('tick-profile');
    const enableSound = document.getElementById('enable-sound');

    // Find a sensible container: prefer the parent of the volume input, else the parent of pitch, else body
    let container = null;
    if (tickVolume && tickVolume.parentElement) container = tickVolume.parentElement;
    else if (tickPitch && tickPitch.parentElement) container = tickPitch.parentElement;
    else if (tickProfile && tickProfile.parentElement) container = tickProfile.parentElement;
    else container = document.body;

    // Avoid injecting multiple times
    if (document.getElementById('test-tick')) return;

    const btn = document.createElement('button');
    btn.id = 'test-tick';
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = '🔊 Test Tick';
    btn.style.marginLeft = '8px';
    btn.style.minWidth = '90px';

    // Add small click handler that uses existing ensureAudioContext if available
    btn.addEventListener('click', async () => {
      try {
        if (has('ensureAudioContext')) {
          window.ensureAudioContext();
        } else if (window.audioCtx && window.audioCtx.state === 'suspended') {
          try { await window.audioCtx.resume(); } catch (e){}
        }

        // If sound is disabled via UI, still allow test to play (but respect user intent if the checkbox exists)
        if (enableSound && !enableSound.checked) {
          // give visual cue to user
          const ok = confirm('Sound is currently disabled in settings. Enable sound to preview?');
          if (!ok) return;
          enableSound.checked = true;
          if (has('saveSettings')) try { window.saveSettings(); } catch(e){}
        }

        const pitchVal = tickPitch ? Number(tickPitch.value) || 750 : 750;
        // volume input might be a range with values like 0.05
        const volumeVal = tickVolume ? Number(tickVolume.value) || 0.05 : 0.05;
        // short beep
        const duration = 0.18; // seconds

        const ctx = (window.ensureAudioContext ? window.ensureAudioContext() && window.audioCtx : window.audioCtx) || new (window.AudioContext || window.webkitAudioContext)();
        // ensure we have a usable audioCtx object
        const audioCtx = ctx instanceof AudioContext || (window.AudioContext && ctx instanceof window.AudioContext) ? ctx : (window.audioCtx || new (window.AudioContext || window.webkitAudioContext)());

        try {
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
        } catch (e) {
          // ignore resume errors
        }

        // oscillator beep
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = pitchVal;
        // clamp volume to safe range
        const clamped = Math.max(0, Math.min(1, volumeVal || 0.05));
        gain.gain.value = clamped;

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        // fade out gently
        gain.gain.setValueAtTime(clamped, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        setTimeout(() => {
          try { osc.stop(); } catch (e) {}
          try { osc.disconnect(); } catch (e) {}
          try { gain.disconnect(); } catch (e) {}
        }, duration * 1000 + 50);
      } catch (err) {
        // Fall back to a simple alert if audio fails
        alert('Unable to play test sound: ' + (err && err.message ? err.message : err));
      }
    });

    // Insert the button into the UI but keep styles minimal
    // If container uses flex, insert next to range; otherwise append
    if (container.style && (container.style.display === 'flex' || getComputedStyle(container).display === 'flex')) {
      container.appendChild(btn);
    } else {
      // try to find a nearby row for tick controls
      const tickRow = document.querySelector('#tick-pitch')?.closest('.row') || document.querySelector('#tick-volume')?.closest('.row') || container;
      tickRow && tickRow.appendChild(btn);
    }
  }

  // Safe JSON import wrapper:
  // - intercept click on the import JSON button
  // - validate basic schema (holidays object, events array, plans array)
  // - store a backup of current JSON data in localStorage under 'clockJSONData_backup_timestamp'
  // - then call the project's importJSONData(file) if available, otherwise write directly to localStorage
  function addSafeImportWrapper() {
    const importBtn = document.getElementById('import-json');
    if (!importBtn) return;

    // Use capture to run before other handlers and take control
    importBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (err) {
            alert('Invalid JSON file: ' + err.message);
            return;
          }

          // Basic schema validation
          const okHolidays = !data.holidays || (typeof data.holidays === 'object' && !Array.isArray(data.holidays));
          const okEvents = !data.events || Array.isArray(data.events);
          const okPlans = !data.plans || Array.isArray(data.plans);

          if (!okHolidays || !okEvents || !okPlans) {
            alert('JSON format not recognised. Expected shape: { holidays: {...}, events: [...], plans: [...] }');
            return;
          }

          // Backup current JSON data (if any)
          try {
            const current = localStorage.getItem('clockJSONData');
            const key = 'clockJSONData_backup_' + new Date().toISOString();
            if (current) localStorage.setItem(key, current);
          } catch (e) {
            // ignore storage backup errors
          }

          // If project has importJSONData(file) function, call it with a File object we recreate
          if (typeof window.importJSONData === 'function') {
            // Recreate a File from parsed text so original importJSONData(file) works
            const recreateFile = new File([text], file.name || 'import.json', { type: 'application/json' });
            try {
              await window.importJSONData(recreateFile);
              // trigger UI update hooks if available
              if (typeof window.updateCalendarPanel === 'function') window.updateCalendarPanel();
              alert('JSON data imported successfully.');
            } catch (err) {
              alert('Import failed: ' + (err && err.message ? err.message : err));
            }
          } else {
            // Directly set sanitized structure
            const sanitized = {
              holidays: data.holidays || {},
              events: data.events || [],
              plans: data.plans || []
            };
            try {
              localStorage.setItem('clockJSONData', JSON.stringify(sanitized));
              if (typeof window.updateCalendarPanel === 'function') window.updateCalendarPanel();
              alert('JSON data imported successfully (fallback path).');
            } catch (err) {
              alert('Failed to save imported data: ' + (err && err.message ? err.message : err));
            }
          }
        } catch (err) {
          alert('Failed to read file: ' + (err && err.message ? err.message : err));
        }
      };
      // trigger native picker
      input.click();
    }, { capture: true });
  }

  // Init: wait for DOM ready, then wire up features
  function init() {
    resumeAudioOnUserGesture();
    injectTestTickButton();
    addSafeImportWrapper();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
