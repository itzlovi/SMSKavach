import { API_BASE } from './constants';

const TIMEOUT_MS = 8000;

/** Wraps fetch with a timeout so the app doesn't hang indefinitely. */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * POST /predict
 * @param {string} message
 * @returns {Promise<{prediction, is_fraud, confidence, svm_prediction, models_agree}>}
 */
export async function predictSMS(message) {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    return { success: true, data };
  } catch (err) {
    return { success: false, error: 'Could not connect to server' };
  }
}

/**
 * POST /check-url
 * @param {string} url
 * @returns {Promise<{url, is_phishing, risk_score, reasons}>}
 */
export async function checkURL(url) {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/check-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    return { success: true, data };
  } catch (err) {
    return { success: false, error: 'Could not connect to server' };
  }
}

/**
 * GET /health
 */
export async function healthCheck() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`);
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: 'Could not connect to server' };
  }
}
