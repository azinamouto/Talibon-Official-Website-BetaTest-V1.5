// Generic text webhook compatible with Slack incoming webhooks. Never echo its URL.
try {
  const url = new URL(process.env.ALERT_WEBHOOK_URL);
  if (url.protocol !== 'https:') throw new Error();
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `Talibon operations workflow failed: ${process.env.GITHUB_WORKFLOW || 'operations'}. Inspect the GitHub Actions run before continuing the launch.` }),
    signal: AbortSignal.timeout(10000), redirect: 'error',
  });
  if (!response.ok) throw new Error();
} catch { console.error('Operations alert delivery failed; verify the configured webhook.'); process.exitCode = 1; }
