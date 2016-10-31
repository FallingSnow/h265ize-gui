angular.module('loggerModule', [])
    .factory('logger', function($sce) {
        let f = {
            events: new EventEmitter(),
            log: [],
            addToLog: function(level, msg) {
                let last = msg[msg.length - 1];
                let clearPrevious = false;
                if (typeof last === 'object') {
                    if (last.__clearLine) {
                        clearPrevious = true;
                    }
                    delete last.__clearLine;
                    delete last.__divider;
                    if (_.keys(msg[msg.length - 1]) < 1) {
                        msg.length--;
                    }
                }

                for (let v in msg) {
                    if (typeof msg[v] === 'object') {
                        msg[v] = helpers.createListString(msg[v]);
                    }
                }

                let text;
                if (msg.length > 1) {
                    text = Array.from(msg).join(' ');
                } else {
                    text = msg[0];
                }
                
                let message = {
                    level: level,
                    text: $sce.trustAsHtml(text.replace(/\n/g, '<br />')),
                    //text: text,
                    replaceMe: clearPrevious
                };
                if (clearPrevious && f.log[f.log.length - 1].replaceMe) {
                    f.log[f.log.length - 1] = message;
                } else
                    f.log.push(message);

                f.events.emit('new message', message);
            },
            debug: function() {
                f.addToLog('debug', arguments);
            },
            verbose: function() {
                f.addToLog('verbose', arguments);
            },
            info: function() {
                f.addToLog('info', arguments);
            },
            alert: function() {
                f.addToLog('alert', arguments);
            },
            warn: function() {
                f.addToLog('warn', arguments);
            },
            error: function() {
                f.addToLog('error', arguments);
            },
        };

        return f;
    });
