#! /usr/bin/env node

const Packager = require('electron-packager');
const Rebuild = require('electron-rebuild');
const Path = require('path');
const Child = require('child_process');

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
  quiet: true,
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
  let spinner;
  let packages = [
    'node-x15',
    'leveldown',
    'secp256k1'/*,
    'wmcc-native'*/
  ];

  const path = './node_modules/';

  _rebuild();
  
  console.log(`Please wait, this may take several moments...`);
  function _rebuild() {
    spinner = _spinner(`Installing ${packages[0]}...`);
    const child = Child.exec(`cd ./node_modules/${packages[0]} && npm install --ignore-scripts`);
  

    child.on('exit', ()=>{
      clearInterval(spinner);
      spinner = _spinner(`Rebuild native module: ${packages[0]}`);
      Rebuild.rebuild({
        buildPath: Path.resolve(path, packages[0]),
        electronVersion: options.electronVersion
      }).then(() => {
        _clearLine(spinner);
        console.log(`\u2714 Finished building: ${packages[0]}!`);
        packages.shift();
        if (packages.length)
          _rebuild();
        else
          _package();
      }).catch((e) => {
        _clearLine();
        console.error(e);
      });
    });
  }
} else {
  _package();
}

function _package() {
  let spinner = _spinner(`Compiling WMCC-Desktop Application...`);
  Packager(options, (err, appPaths) => {
    _clearLine(spinner);
    if (err) {
      console.log(err);
      process.exit(-1);
    }
    console.log(`\u2714 Done! Application compiled to: ${Path.resolve(__dirname, appPaths[0])}\n`);
  });
}

function _spinner(t) {
  let x = 0;
  const f = ["- ----","-- ---","--- --","---- -","----- ","---- -","--- --","-- ---","- ----"," -----"];
  return setInterval(()=>{
    x = (x>f.length-1)?0:x;
    process.stdout.write(`\r${f[x++]} ${t}`);
  }, 150);
}

function _clearLine (o) {
  if (o) clearInterval(o);
  process.stdout.clearLine();
  process.stdout.write(`\r`);
}