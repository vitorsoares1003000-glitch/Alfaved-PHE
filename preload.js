const { contextBridge, ipcRenderer } = require('electron');
/**
 * preload.js — Ponte segura entre o renderer (index.html) e o processo
 * principal (main.js). Exposição mínima com contextIsolation ativo.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Salva o datasheet em PDF A4 limpo.
  savePdf: (htmlContent) => {
    if (typeof htmlContent !== 'string' || htmlContent.length === 0) {
      return Promise.resolve({ ok: false, error: 'Conteúdo do datasheet inválido.' });
    }
    return ipcRenderer.invoke('save-pdf', htmlContent);
  },
  // Salva o datasheet gerado pelo dimensionador em arquivo HTML.
  saveDatasheet: (htmlContent) => {
    if (typeof htmlContent !== 'string' || htmlContent.length === 0) {
      return Promise.resolve({ ok: false, error: 'Conteúdo do datasheet inválido.' });
    }
    return ipcRenderer.invoke('save-datasheet', htmlContent);
  },
  // Retorna a versão do aplicativo.
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // Caminho de exportação padrão.
  getExportPath: () => ipcRenderer.invoke('get-export-path')
});
