angular.module('filtersModule', [])
    .filter('sanitizeStateName', function() {
        return function(input) {
            return input.substr(0, input.length - 5)
                //https://stackoverflow.com/questions/4149276/javascript-camelcase-to-regular-form
                // insert a space before all caps
                .replace(/([A-Z])/g, ' $1');
        };
    })
    .filter('objLength', function() {
        return function(input) {
            return Object.keys(input).length;
        };
    })
    .filter('localImage', function() {
        return function(input) {
            return "file://" + (OS.platform() === 'win32' ? '/' : '') + Path.resolve('public/img/' + input);
        };
    })
    .filter('aboveLogLevel', function() {
        let logLevels = {
            error: 0,
            warn: 1,
            alert: 2,
            info: 3,
            verbose: 4,
            debug: 5
        };
        return function(input, level) {
            let messages = _.filter(input, function(m) {
                return logLevels[m.level] <= level;
            });
            return messages;
        };
    })
    .filter('fileSize', function() {
        return function(input) {
            input = parseInt(input) || 0;
            return filesize(input);
        };
    });
