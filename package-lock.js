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
    "compression": "maximum",
    "files": [
      "index.html",
      "main.js",
      "preload.js",
      "thermal.js",
      "tema.css",
      "gauges.js",
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
      "shortcutName": "AlfaVed PHE",
      "artifactName": "AlfaVed-PHE-${version}-Setup.${ext}"
    },
    "portable": {
      "artifactName": "AlfaVed-PHE-${version}-Portable.${ext}"
    }
  }
}
