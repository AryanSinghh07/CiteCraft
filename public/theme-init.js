// Applies the saved light/dark theme before first paint to avoid a flash.
// Kept as a separate file so the Content-Security-Policy can forbid inline scripts.
try {
  var t = localStorage.getItem('citecraft-theme');
  if (t === 'dark' || ((!t || t === 'system') && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
