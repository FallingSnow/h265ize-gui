"use strict";
const Path = require('path');
const OS = require('os');
const EventEmitter = require('events');

const Config = require('./package.json');

/* nwjs */
const gui = require('nw.gui');

const _ = require('lodash');
const h265ize = require('h265ize');
const mime = require('mime');
const ffmpeg = require('fluent-ffmpeg');
const filesize = require('filesize');
const latest = require('npm-latest');
require('angular-moment');
Promise = require('bluebird');

const helpers = require('./public/js/helpers.js');
const bmpStreamDecoder = require('./public/js/bmpStreamDecoder.js');

let LinvoDB = global.LinvoDB;

ffmpeg.getAvailableCodecs(function(err, codecs) {
    console.log('Available codecs:');
    console.dir(codecs);
});

LinvoDB.Models = {
    Setting: new LinvoDB('setting', {
        name: {
            type: String
        },
        value: {
            type: String
        }
    }),
    Preset: new LinvoDB('preset', {
        name: {
            type: String,
            default: 'new'
        },
        description: {
            type: String,
            default: 'A new preset...'
        },
        type: {
            type: String,
            default: 'custom'
        },
        options: {
            outputFormat: {
                type: String,
                default: 'mkv'
            },
            nativeLanguage: {
                type: String,
                default: 'English'
            },
            destination: {
                type: String,
                default: OS.homedir()
            },
            preview: {
                type: Boolean,
                default: false
            },
            screenshots: {
                type: Boolean,
                default: false
            },
            delete: {
                type: Boolean,
                default: false
            },
            previewLength: {
                type: Number,
                default: 30000
            },
            normalizationLevel: {
                type: Number,
                default: 1
            },
            quality: {
                type: Number,
                default: 20
            },
            videoBitrate: {
                type: Number,
                default: 0
            },
            preset: {
                type: String,
                default: 'fast'
            },
            extraOptions: {
                type: String,
                default: ""
            },
            heAudio: {
                type: Boolean,
                default: false
            },
            forceHeAudio: {
                type: Boolean,
                default: false
            },
            downmixHeAudio: {
                type: Boolean,
                default: false
            },
            override: {
                type: Boolean,
                default: false
            },
            accurateTimestamps: {
                type: Boolean,
                default: false
            },
            upconvert: {
                type: Boolean,
                default: true
            }
        }
    }, {})
};
const Models = LinvoDB.Models;
Models.Setting.findOne({
    name: 'theme'
}, function(err, doc) {
    if (err) {
        console.error(err);
    }
    let settings = {
        accent: 'blue-grey'
    };
    if (doc) {
        settings.theme = doc.value;
    } else {
        settings.theme = 'teal';
    }
    loadApp(settings);
});

function loadApp(settings) {
    angular.element(document).ready(function() {
        angular.bootstrap(document, ['h265ize-gui']);
    });
    angular.module('h265ize-gui', ['ngMaterial', 'ngSanitize', 'ui.router', 'picardy.fontawesome', 'keyboardShortcut', 'angularMoment',
            'aboutModule', 'preferencesModule', 'loggerModule', 'tourModule', 'filtersModule', 'menuModule', 'videoBlockModule', 'toastModule',
            'logModule', 'queueModule', 'addVideosModule', 'processedVideosModule'
        ])
        .config(function($stateProvider, $urlRouterProvider, $mdThemingProvider) {

            let basicPages = ['addVideos', 'queue', 'log', 'presetManager', 'processedVideos'];
            $urlRouterProvider.otherwise("/" + basicPages[0]);

            for (let v in basicPages) {
                let page = basicPages[v];
                $stateProvider
                    .state(page + 'State', {
                        url: "/" + page,
                        templateUrl: "html/" + page + ".html",
                        controller: page + 'Ctrl'
                    });
            }

            $mdThemingProvider.definePalette('white', {
                '50': 'ffffff',
                '100': 'ffffff',
                '200': 'ffffff',
                '300': 'ffffff',
                '400': 'ffffff',
                '500': 'ffffff',
                '600': 'ffffff',
                '700': 'ffffff',
                '800': 'ffffff',
                '900': 'ffffff',
                'A100': 'ffffff',
                'A200': 'ffffff',
                'A400': 'ffffff',
                'A700': 'ffffff'
            });

            $mdThemingProvider.theme('default')
                .primaryPalette(settings.theme)
                .accentPalette(settings.accent)
            $mdThemingProvider.theme('dark', 'default')
                .dark();
            $mdThemingProvider.theme('formDark', 'default')
                .primaryPalette('grey')
                .dark();

        })
        .run(function($rootScope, $mdToast, $mdDialog, $state, logger, Tour) {
            $rootScope.platform = OS.platform();
            $rootScope.h265izeGui = require('./package.json');
            $rootScope.h265ize = require('./node_modules/h265ize/package.json');
            $rootScope.settings = settings;

            $rootScope.openLink = function(link) {
                gui.Shell.openExternal(link);
            };

            $rootScope.tour = new Tour({
                steps: [{
                    title: 'Add Videos Tab',
                    text: 'Here you can the encoding settings for each batch of videos.',
                    target: '[ui-sref="addVideosState"]',
                    imagePath: 'tour/add-videos-tab.jpg'
                }, {
                    title: 'Encoder Settings',
                    text: `Set the options for the encoder.`,
                    target: '#addVideoSettings',
                    state: 'addVideosState'
                }, {
                    title: 'Presets',
                    target: '.md-primary.md-subheader',
                    text: 'Test',
                    state: 'presetManagerState'
                }]
            });

            let win = nw.Window.get();
            win.on('close', function() {
                setTimeout(function() {
                    win.close(true);
                }, 2000);
                $rootScope.Encoder.stop();
                win.close(true);
            });
            win.show();

            $rootScope.maximized = false;
            //win.unmaximize();

            $rootScope.exit = function() {
                win.close();
            };
            $rootScope.minimize = function() {
                win.minimize();
            };
            $rootScope.maximize = function() {
                if ($rootScope.maximized) {
                    win.restore();
                    $rootScope.maximized = false;
                } else {
                    win.maximize();
                    $rootScope.maximized = true;
                }
            };

            $rootScope.$state = $state;

            $rootScope.toastQueue = [];
            $rootScope.currentToast;
            $rootScope.queueToast = function(toast) {
                if (toast)
                    if ($rootScope.currentToast) {
                        $rootScope.toastQueue.push(toast);
                    } else {
                        $rootScope.currentToast = $mdToast.show(toast);
                    }
            };


            $rootScope.Encoder = new h265ize.Encoder(logger, {enablePreviewStream: true});

            $rootScope.startEncoder = function() {
                if ($rootScope.Encoder.queue.length <= 0 && !$rootScope.Encoder.currentlyProcessing)
                    return $rootScope.queueToast({
                        hideDelay: 3000,
                        locals: {
                            text: 'There are no files in queue.'
                        },
                        position: 'bottom left',
                        controller: 'ToastCtrl',
                        templateUrl: 'html/toastTemplate.html'
                    });

                $rootScope.Encoder.start();
            };
            $rootScope.pauseEncoder = function() {
                $rootScope.Encoder.pause();
            };
            $rootScope.stopEncoder = function() {
                $rootScope.Encoder.stop();
            };

            function statusChangeHandler(status) {
                if (status === 'finished') {
                    $rootScope.Encoder.stop();
                }
                $rootScope.$applyAsync();
            }
            $rootScope.Encoder.events.removeListener('statusChange', statusChangeHandler);
            $rootScope.Encoder.events.on('statusChange', statusChangeHandler);

            $rootScope.showPreferences = function(ev) {
                $mdDialog.show({
                    controller: 'preferencesCtrl',
                    templateUrl: 'html/preferences.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true
                });
            };

            $rootScope.openVideo = function(path) {
                gui.Shell.openItem(path);
                $rootScope.queueToast({
                    hideDelay: 3000,
                    locals: {
                        text: 'Opening ' + path + '...'
                    },
                    position: 'bottom left',
                    controller: 'ToastCtrl',
                    templateUrl: 'html/toastTemplate.html'
                });
            };
        })
}
