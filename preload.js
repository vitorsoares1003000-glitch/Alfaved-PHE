[preload.js](https://github.com/user-attachments/files/31847757/preload.js)
const { contextBridge, ipcRenderer } = require('electron');

/**
 * preload.js — Ponte segura entre o renderer (index.html) e o processo
 * principal (main.js). Expõe apenas as APIs necessárias, com
 * contextIsolation ativo e nodeIntegration desligado.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Salva o datasheet em PDF A4 limpo (recebe o HTML do datasheet).
  savePdf: (htmlContent) => {
    if (typeof htmlContent !== 'string' || htmlContent.length === 0) {
      return Promise.reject(new Error('Conteúdo do datasheet inválido.'));
    }
    return ipcRenderer.invoke('save-pdf', htmlContent);
  },
  // Salva o datasheet gerado pelo dimensionador em arquivo HTML.
  saveDatasheet: (htmlContent) => {
    if (typeof htmlContent !== 'string' || htmlContent.length === 0) {
      return Promise.reject(new Error('Conteúdo do datasheet inválido.'));
    }
    return ipcRenderer.invoke('save-datasheet', htmlContent);
  },
  // Retorna a versão do aplicativo (lida do package.json no main).
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // Caminho de exportação padrão (pasta de documentos do usuário).
  getExportPath: () => ipcRenderer.invoke('get-export-path'),
});
