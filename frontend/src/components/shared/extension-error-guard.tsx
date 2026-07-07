/**
 * Browser wallet extensions (MetaMask, Coinbase Wallet, OKX, Backpack, etc.) inject content
 * scripts into every page and occasionally throw/log errors of their own - e.g. "The source ...
 * has not been authorized yet" while their background/content-script handshake is still settling,
 * or a bare `console.error('Error checking default wallet status', {})` from their provider probe.
 * Next.js's dev overlay surfaces all of these as if they were app errors, even though the stack
 * trace points at `chrome-extension://...`.
 *
 * This must run before Next's own dev-overlay listeners attach, or preventDefault() here is too
 * late to stop the overlay from already having rendered. Registering it from a React effect loses
 * that race (effects fire well after Next's framework chunk has booted). So this is injected as a
 * plain inline script in <head>, which executes synchronously during HTML parsing - ahead of any
 * deferred/module script Next emits for its own bundle.
 */
export const EXTENSION_ERROR_GUARD_SCRIPT = `
(function () {
  function isExtensionStack(value) {
    return typeof value === 'string' && value.indexOf('chrome-extension://') !== -1;
  }

  function isLikelyExtensionRejection(reason) {
    if (isExtensionStack(reason && reason.stack)) return true;
    if (reason && typeof reason === 'object' && !(reason instanceof Error)) {
      try {
        return Object.keys(reason).length === 0;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  var originalConsoleError = console.error;
  console.error = function () {
    if (isExtensionStack(new Error().stack)) return;
    return originalConsoleError.apply(console, arguments);
  };

  window.addEventListener('error', function (event) {
    if (isExtensionStack(event.filename) || isExtensionStack(event.error && event.error.stack)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    if (isLikelyExtensionRejection(event.reason)) {
      event.preventDefault();
    }
  }, true);
})();
`;
