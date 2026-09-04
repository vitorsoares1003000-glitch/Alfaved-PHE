[package.json](https://github.com/user-attachments/files/31847686/package.json)
{
  "name": "alfaved-phe",
  "version": "1.4.0",
  "description": "AlfaVed Dimensionador PHE",
  "main": "main.js",
  "author": "AlfaVed Solucoes Industriais",
  "license": "UNLICENSED",
  "scripts": {
    "start": "electron .",
    "dist": "electron-builder --win"
  },
  "devDependencies": {
    "electron": "^43.4.1",
    "electron-builder": "^26.15.3"
  },
  "build": {
    "appId": "br.com.alfaved.phe",
    "productName": "AlfaVed PHE",
    "files": [
      "index.html",
      "main.js",
      "preload.js",
      "logo.png"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "shortcutName": "AlfaVed PHE"
    }
  }
}
