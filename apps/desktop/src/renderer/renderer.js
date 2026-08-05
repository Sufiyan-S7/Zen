const version = window.zen?.version ?? 'development';
const mode = window.zen?.mode ?? 'local-first';

document.querySelector('#version').textContent = `v${version}`;
document.querySelector('#mode').textContent = mode;

document.querySelector('#celebrate').addEventListener('click', () => {
  const toast = document.querySelector('#toast');
  toast.textContent = 'Day 1 foundation complete — Zen is ready for its local brain.';
  toast.classList.add('visible');
  window.setTimeout(() => toast.classList.remove('visible'), 3600);
});

