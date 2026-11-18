declare global {
  interface Window {
    Razorpay: any;
  }
}

let sdkPromise: Promise<boolean> | null = null;

/**
 * Loads Razorpay Checkout SDK efficiently with deduplication and timeout protection.
 * If already loaded, resolves immediately without re-injecting scripts.
 */
export function loadRazorpaySdk(timeoutMs = 15000): Promise<boolean> {
  if (typeof window !== 'undefined' && typeof window.Razorpay === 'function') {
    return Promise.resolve(true);
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise<boolean>((resolve, reject) => {
    const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`) as HTMLScriptElement | null;

    let timeoutId: any = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      cleanup();
      sdkPromise = null;
      reject(new Error('Razorpay Checkout SDK failed to load within timeout period. Please check your network connection.'));
    }, timeoutMs);

    const onScriptLoaded = () => {
      cleanup();
      if (typeof window.Razorpay === 'function') {
        resolve(true);
      } else {
        sdkPromise = null;
        reject(new Error('Razorpay SDK loaded, but window.Razorpay was not found.'));
      }
    };

    const onScriptError = () => {
      cleanup();
      sdkPromise = null;
      reject(new Error('Failed to load Razorpay Checkout SDK. Please check your internet connection.'));
    };

    if (existingScript) {
      if (typeof window.Razorpay === 'function') {
        cleanup();
        return resolve(true);
      }
      existingScript.addEventListener('load', onScriptLoaded, { once: true });
      existingScript.addEventListener('error', onScriptError, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = onScriptLoaded;
      script.onerror = onScriptError;
      document.head.appendChild(script);
    }
  });

  return sdkPromise;
}
