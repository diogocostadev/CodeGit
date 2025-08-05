// ===== DESABILITAR MENU DE CONTEXTO E ATALHOS DO BROWSER =====

// Desabilitar menu de contexto (botão direito)
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});

// Desabilitar F12 (DevTools)
document.addEventListener('keydown', (e) => {
  // F12
  if (e.keyCode === 123) {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+Shift+I (DevTools)
  if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+Shift+J (Console)
  if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+U (View Source)
  if (e.ctrlKey && e.keyCode === 85) {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+Shift+C (Element Inspector)
  if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
    e.preventDefault();
    return false;
  }
  
  // Ctrl+S (Save Page) - permitir apenas se estiver em input/textarea
  if (e.ctrlKey && e.keyCode === 83) {
    const target = e.target as HTMLElement;
    if (!target.matches('input, textarea, [contenteditable="true"]')) {
      e.preventDefault();
      return false;
    }
  }
});

// Desabilitar drag and drop de arquivos externos (que abriria no browser)
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  return false;
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  return false;
});

// Desabilitar seleção de texto com mouse (mas permitir em inputs)
document.addEventListener('selectstart', (e) => {
  const target = e.target as HTMLElement;
  if (!target.matches('input, textarea, pre, code, .code-block, .commit-hash, .branch-name, .file-path, [contenteditable="true"]')) {
    e.preventDefault();
    return false;
  }
});

// Prevenir zoom com Ctrl+Scroll
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    return false;
  }
}, { passive: false });

// Desabilitar Ctrl+Plus/Minus (zoom)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && (e.keyCode === 187 || e.keyCode === 189)) { // + e -
    e.preventDefault();
    return false;
  }
});

console.log('🔒 Context menu and browser shortcuts disabled - Native app experience enabled');