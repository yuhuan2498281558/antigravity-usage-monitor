/**
 * @fileoverview Async entry point for Antigravity Usage & Speed Monitor.
 */

import { App } from './App.js';
import { startAsyncTelemetryLoop } from './store/telemetryStore.js';

export async function bootstrapApp(mountTarget = document.getElementById('app-root')) {
  if (!mountTarget) return null;
  const appInstance = App();
  mountTarget.appendChild(appInstance.el);
  const stopPolling = startAsyncTelemetryLoop(2000);
  return {
    appInstance,
    stopPolling,
  };
}

export function init() {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
      bootstrapApp();
    });
  } else {
    bootstrapApp();
  }
}

init();
