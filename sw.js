// Service worker Catatanku: menampilkan notifikasi jadwal harian.
// Jadwal disalin halaman ke IndexedDB 'catatanku-notif' (kunci 'jadwal'), karena service worker tidak bisa membaca localStorage.
const pad = n => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const openDB = () => new Promise((res, rej) => {
  const q = indexedDB.open('catatanku-notif', 1);
  q.onupgradeneeded = () => q.result.createObjectStore('kv');
  q.onsuccess = () => res(q.result);
  q.onerror = () => rej(q.error);
});
const get = async k => { const db = await openDB(); return new Promise(res => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); };
const set = async (k, v) => { const db = await openDB(); return new Promise(res => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = res; }); };

async function notifyToday() {
  const k = todayKey();
  if (await get('last') === k) return;
  const list = ((await get('jadwal')) || {})[k] || [];
  if (!list.length) return;
  await set('last', k);
  await self.registration.showNotification(`📅 Jadwal hari ini (${list.length})`, {
    body: list.slice(0, 5).join('\n') + (list.length > 5 ? `\n+${list.length - 5} lainnya` : ''),
    icon: 'icon-192.png', badge: 'icon-192.png', tag: 'jadwal-' + k, data: { url: './' }
  });
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
// Android (aplikasi terpasang): browser membangunkan service worker beberapa kali sehari
self.addEventListener('periodicsync', e => { if (e.tag === 'jadwal-harian') e.waitUntil(notifyToday()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
