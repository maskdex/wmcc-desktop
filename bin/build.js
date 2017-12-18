#! /usr/bin/env node

const Packager = require('electron-packager');
const Rebuild = require('electron-rebuild');
const Path = require('path');

const args = process.argv.slice(2);
const opts = {};

if (process.argv.length <= 3) {
    console.log("Arguments must contain at least platform and arch parameters, example wmcc-build --platform=win32 --arch=x64");
    process.exit(-1);
}

for (let arg of args) {
  const opt = arg.split("=");
  opts[opt[0].substring(2)] = opt[1];
}

if (!opts.platform || !opts.arch) {
    console.log("Arguments must contain at least platform and arch parameters, example wmcc-build --platform=win32 --arch=x64");
    process.exit(-1);
}

const options = {
  dir: opts.dir || '.',
  platform: opts.platform,
  arch: opts.arch,
  electronVersion: opts.electronVersion || '1.7.9',
  out: opts.out || 'release',
  overwrite: true,
  asar: true,
  prune: true,
  packageManager: false
}

switch (opts.platform) {
  case 'win32':
    options.icon = './source/image/favicon.ico';
    options.win32metadata = {};
    options.win32metadata.CompanyName = 'WorldMobileCoin';
    options.win32metadata.FileDescription = 'WMCC Node ™ WorldMobileCoin';
    options.win32metadata.ProductName = 'WorldMobileCoin © WMCC Node Application';
    break;
  case 'linux':
    options.icon = './source/image/favicon.png';
    break;
  case 'darwin':
    options.icon = './source/image/favicon.icns';
    break;
}

if (opts.rebuild) {
  console.log(`Please wait, this may take several moments...`);
  let packages = [
    'node-x15',
    'leveldown',
    'secp256k1'/*,
    'wmcc-native'*/
  ];

  const path = './node_modules/';

  _rebuild();

  function _rebuild() {
    console.log(`Rebuild native module: ${packages[0]}`);
    Rebuild.rebuild({
      buildPath: Path.resolve(path, packages[0]),
      electronVersion: options.electronVersion
    }).then(() => {
      console.log(`Done build ${packages[0]}!`);
      packages.shift();
      if (packages.length)
        _rebuild();
      else
        _package();
    }).catch((e) => console.error(e));

  }
} else {
  _package();
}

function _package() {
  console.log(`Compiling WMCC-Desktop Application...`);
  Packager(options, (err, appPaths) => {
    if (err) {
      console.log(err);
      process.exit(-1);
    }
    console.log(`Done! Application compiled to: ${appPaths}`);
  });
}