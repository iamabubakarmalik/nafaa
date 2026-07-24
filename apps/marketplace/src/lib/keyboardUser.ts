export function initKeyboardUserDetection() {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-user');
    }
  };
  const onMouseDown = () => {
    document.body.classList.remove('keyboard-user');
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('mousedown', onMouseDown);
}
