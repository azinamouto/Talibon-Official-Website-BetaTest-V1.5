// R2 tombstone. No SDK, credentials, database, email or SMS provider is initialized.
Deno.serve(() => new Response(JSON.stringify({ success: false, statusCode: 410,
  error: 'Gone', message: 'Online service notifications are not available.' }), {
  status: 410, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
}));
