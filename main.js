[main.js](https://github.com/user-attachments/files/31847666/main.js)
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: 'AlfaVed Dimensionador PHE',
    icon: path.join(__dirname, 'logo.png'),
    autoHideMenuBar: true,
    backgroundColor: '#f4f6f8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  // Impede abertura de janelas extras a partir do renderer
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadFile('index.html');
  return win;
}

// Lê a logo do app e devolve como data URL base64.
// O printToPDF não resolve caminhos relativos no arquivo temporário;
// embutir a logo em base64 garante que ela apareça no PDF.
async function logoComoDataURL() {
  try {
    const buf = await fs.readFile(path.join(__dirname, 'logo.png'));
    return 'data:image/png;base64,' + buf.toString('base64');
  } catch (e) {
    return '';
  }
}

// Corrige o datasheet carregado na janela oculta ANTES do printToPDF:
// 1) Canvas do diagrama -> <img> PNG (printToPDF não captura canvas serializado);
// 2) Logo quebrada (caminho relativo não resolve no temp) -> logo embutida em base64.
async function prepararDatasheetParaPdf(targetWin, logoDataURL) {
  await targetWin.webContents.executeJavaScript(`
    (async () => {
      const logo = ${JSON.stringify(logoDataURL)};

      // 1. Diagrama de temperatura: substitui todo canvas por imagem PNG.
      document.querySelectorAll('canvas').forEach((cv) => {
        try {
          const img = document.createElement('img');
          img.src = cv.toDataURL('image/png');
          img.style.width = '100%';
          img.style.maxWidth = '700px';
          img.style.border = '1px solid #ccc';
          cv.replaceWith(img);
        } catch (e) { /* canvas vazio ou sem permissão */ }
      });

      // 2. Logo: corrige imagens que não carregaram (404 no caminho relativo do temp).
      if (logo) {
        document.querySelectorAll('img').forEach((img) => {
          if (img.complete && img.naturalWidth === 0) {
            img.src = logo;
          }
        });
      }

      // Pequeno respiro para o navegador aplicar as mudanças antes do print.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    })()
  `);
}

app.whenReady().then(() => {
  createWindow();

  // Salva o datasheet em PDF A4 limpo, sem a interface do app.
  ipcMain.handle('save-pdf', async (event, htmlContent) => {
    // Guarda: conteúdo inválido -> erro, nunca imprimir a UI principal
    if (typeof htmlContent !== 'string' || htmlContent.length === 0) {
      throw new Error('Conteúdo do datasheet vazio ou inválido.');
    }
    const win = BrowserWindow.fromWebContents(event.sender);
    const tempPath = path.join(app.getPath('temp'), 'alfaved-datasheet-' + crypto.randomUUID() + '.html');
    let targetWin = null;
    try {
      await fs.writeFile(tempPath, htmlContent, 'utf-8');
      targetWin = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
      });
      await targetWin.loadFile(tempPath);

      // >>> CORREÇÃO: prepara diagrama (canvas->img) e logo (base64) antes do PDF
      const logoDataURL = await logoComoDataURL();
      await prepararDatasheetParaPdf(targetWin, logoDataURL);

      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'Salvar Datasheet em PDF',
        defaultPath: path.join(app.getPath('documents'), 'AlfaVed-Datasheet.pdf'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (canceled || !filePath) return null;
      const pdf = await targetWin.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { marginType: 'none' }
      });
      await fs.writeFile(filePath, pdf);
      return filePath;
    } finally {
      if (targetWin && !targetWin.isDestroyed()) targetWin.destroy();
      try { await fs.unlink(tempPath); } catch (e) { /* arquivo já removido */ }
    }
  });

  // Salva o datasheet em arquivo HTML via diálogo nativo.
  ipcMain.handle('save-datasheet', async (event, htmlContent) => {
    if (typeof htmlContent !== 'string' || htmlContent.length === 0) {
      return { ok: false, error: 'Conteúdo do datasheet vazio.' };
    }
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Salvar Datasheet',
      defaultPath: path.join(app.getPath('documents'), 'AlfaVed-Datasheet.html'),
      filters: [
        { name: 'HTML', extensions: ['html'] },
        { name: 'Todos os arquivos', extensions: ['*'] }
      ]
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    try {
      await fs.writeFile(filePath, htmlContent, 'utf-8');
      return { ok: true, filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Retorna a versão do app.
  ipcMain.handle('get-app-version', () => app.getVersion());
  // Retorna o caminho padrão de exportação (pasta Documentos do usuário).
  ipcMain.handle('get-export-path', () => app.getPath('documents'));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
