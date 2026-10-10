// Posts leads to the Google Apps Script web app in google-sheet.gs, which adds them to the sheet.

export async function sendToSheet(url, secret, columns, rows, { fetchImpl = fetch } = {}) {
  if (!secret) throw new Error('LEADS_SHEET_SECRET is not set');
  // Apps Script answers a POST with a redirect to the result, which fetch follows as a GET.
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ secret, columns, rows }),
    redirect: 'follow',
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Google Sheet did not answer with JSON (HTTP ${res.status}). Check the web app URL and that access is set to "Anyone". ${text.slice(0, 200)}`);
  }
  if (data.error) throw new Error(`Google Sheet refused the leads: ${data.error}`);
  return data;
}
