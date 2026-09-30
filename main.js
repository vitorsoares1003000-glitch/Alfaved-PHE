const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

// Marcador esperado no HTML do datasheet (validação de conteúdo antes do PDF)
const DATASHEET_MARKER = 'alfaved-datasheet';

let mainWindow = null;

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
  mainWindow = win;
  return win;
}

// Confirma que o conteúdo é o HTML do datasheet (não HTML arbitrário)
function isDatasheetHtml(html) {
  return typeof html === 'string' && html.length > 0 &&
    (html.includes(DATASHEET_MARKER) || html.includes('id="datasheet"'));
}

// Lê a logo do app e devolve como data URL base64.
async function logoComoDataURL() {
  try {
    const buf = await fs.readFile(path.join(__dirname, 'logo.png'));
    return 'data:image/png;base64,' + buf.toString('base64');
  } catch (e) {
    return '';
  }
}

// Corrige o datasheet carregado na janela oculta ANTES do printToPDF.
async function prepararDatasheetParaPdf(targetWin, logoDataURL) {
  await targetWin.webContents.executeJavaScript(`
    (async () => {
      const logo = ${JSON.stringify(logoDataURL)};
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
      if (logo) {
        document.querySelectorAll('img').forEach((img) => {
          if (img.complete && img.naturalWidth === 0) {
            img.src = logo;
          }
        });
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    })()
  `);
}

app.whenReady().then(() => {
  createWindow();

  // Salva o datasheet em PDF A4 limpo.
  ipcMain.handle('save-pdf', async (event, htmlContent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    // Validação de origem: só a janela principal pode chamar
    if (!win || win !== mainWindow) {
      return { ok: false, error: 'Origem inválida.' };
    }
    // Validação de conteúdo: só imprime HTML do datasheet
    if (!isDatasheetHtml(htmlContent)) {
      return { ok: false, error: 'Conteúdo do datasheet vazio ou inválido.' };
    }
    const tempPath = path.join(app.getPath('temp'), 'alfaved-datasheet-' + crypto.randomUUID() + '.html');
    let targetWin = null;
    try {
      await fs.writeFile(tempPath, htmlContent, 'utf-8');
      targetWin = new BrowserWindow({
        show: false,
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
      });
      // Timeout de carregamento (evita travamento se o HTML demorar)
      await Promise.race([
        targetWin.loadFile(tempPath),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout ao carregar o datasheet.')), 10000))
      ]);
      const logoDataURL = await logoComoDataURL();
      await prepararDatasheetParaPdf(targetWin, logoDataURL);
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'Salvar Datasheet em PDF',
        defaultPath: path.join(app.getPath('documents'), 'AlfaVed-Datasheet.pdf'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (canceled || !filePath) return { ok: false, canceled: true };
      const pdf = await targetWin.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { marginType: 'none' }
      });
      await fs.writeFile(filePath, pdf);
      return { ok: true, filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      if (targetWin && !targetWin.isDestroyed()) targetWin.destroy();
      try { await fs.unlink(tempPath); } catch (e) { /* arquivo já removido */ }
    }
  });

  // Salva o datasheet em arquivo HTML via diálogo nativo.
  ipcMain.handle('save-datasheet', async (event, htmlContent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win !== mainWindow) {
      return { ok: false, error: 'Origem inválida.' };
    }
    if (!isDatasheetHtml(htmlContent)) {
      return { ok: false, error: 'Conteúdo do datasheet vazio ou inválido.' };
    }
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
  // Retorna o caminho padrão de exportação.
  ipcMain.handle('get-export-path', () => app.getPath('documents'));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
