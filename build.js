const OS = require('os');
const NwBuilder = require('nw-builder');

let nw = new NwBuilder({
    files: ['./**/**', '!build/**/**', '!cache/**/**'], // use the glob format
    platforms: ['win64'],
    version: 'latest',
    flavor: 'normal',
    cacheDir: 'cache',
    // flavor: 'sdk',
    appName: null,
    appVersion: null,
    zip: false
});

//Log stuff you want

nw.on('log', console.log);

nw.build().then(function() {
    console.log('all done!');
}).catch(function(error) {
    console.error(error);
});
