const input = document.getElementById('overlay-input');

function focusInput() {
  input.value = '';
  input.focus();
}

focusInput();
window.zenOverlay.onShow(focusInput);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    window.zenOverlay.close();
  }
});
