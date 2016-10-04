const OS = require('os');
const NwBuilder = require('nw-builder');

let nw = new NwBuilder({
    files: ['./**/**', '!build/**/**', '!nbproject/**/**'], // use the glob format
    platforms: ['win64'],
    version: 'latest',
    cacheDir: OS.tmpDir(),
//    flavor: 'normal',
    flavor: 'sdk',
    appName: null,
    appVersion: null,
});

//Log stuff you want

nw.on('log',  console.log);

nw.build().then(function () {
   console.log('all done!');
}).catch(function (error) {
    console.error(error);
});