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
const recursive = require('recursive-readdir');
const ffmpeg = require('fluent-ffmpeg');
const filesize = require('filesize');
const latest = require('npm-latest');
require('angular-moment');
Promise = require('bluebird');

let LinvoDB = global.LinvoDB;

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
    let settings = {};
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
    angular.module('h265ize-gui', ['ngMaterial', 'ngSanitize', 'ui.router', 'picardy.fontawesome', 'keyboardShortcut', 'angularMoment'])
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
                //                        .accentPalette('blue-grey');
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


            $rootScope.Encoder = new h265ize.Encoder(logger);

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
        .directive('encoderSettings', function() {
            return {
                restrict: 'E',
                templateUrl: 'html/encoderSettings.html',
                scope: {
                    preset: '=',
                    options: '=',
                    editMode: '@'
                },
                controller: 'encoderSettingsCtrl'
            };
        })
        .directive('videoBlock', function() {
            return {
                restrict: 'E',
                replace: true,
                templateUrl: 'html/videoBlock.html',
                scope: {
                    video: '=',
                }
            };
        })
        .controller('normalizationCtrl', function($scope, $mdDialog) {
            $scope.levels = {
                0: {
                    description: "No normalization of any kind is applied."
                },
                1: {
                    description: "Video is auto cropped."
                },
                2: {
                    description: "Subtitle Title normalization for subtitles streams already without a title. Audio Title normalization for audio streams already without a title. Language normalization detected from title if already exists. Search title for language and apply it to language tag in metadata."
                },
                3: {
                    description: "Simple RMS-based audio normalization to -2.0 dBFS. This involves the peak volume being raised or lowered to -2.0 dBFS."
                },
                4: {
                    description: "Loudnorm based audio normalization to -2.0 dBFS. This involves a dual pass through the loudnorm audio filter."
                },
                5: {
                    description: "Dynaudnorm based audio normalization to -2.0 dBFS. This involves a pass through the dynaudnorm audio filter."
                },
            }

            $scope.close = function() {
                $mdDialog.cancel();
            }
        })
        .controller('encoderSettingsCtrl', function($scope, $mdDialog, videosManager) {
            $scope.debounceInterval = 500;
            $scope.tooltipDelay = 0;
            $scope.nativeLanguages = require('./node_modules/h265ize/lib/languages.json').full;

            $scope.outputFormats = [
                'mkv',
                'mp4'
            ];

            $scope.presets = [
                'ultrafast',
                'superfast',
                'veryfast',
                'faster',
                'fast',
                'medium',
                'slow',
                'slower',
                'veryslow',
                'placebo'
            ];


            $scope.showNormalizationLevels = function(ev) {
                $mdDialog.show({
                    controller: 'normalizationCtrl',
                    templateUrl: 'html/normalizationLevels.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true
                });
            };

            $scope.$watch('options.outputFormat', function(cur) {
                if (cur === 'mp4')
                    $scope.heAudio = false;
            });
            $scope.$watch('options.heAudio', function(cur) {
                if (!cur) {
                    $scope.options.forceHeAudio = false;
                    $scope.options.downmixHeAudio = false;
                }
            });

            $scope.selectDestination = function() {
                videosManager.selectDirectory().then(function(path) {
                    $scope.$applyAsync(function() {
                        $scope.options.destination = path;
                    });
                });
            };
        })
        .controller('MenuCtrl', function($mdDialog, videosManager) {
            this.sampleAction = function(name, ev) {
                $mdDialog.show($mdDialog.alert()
                    .title(name)
                    .textContent('You triggered the "' + name + '" action')
                    .ok('Great')
                    .targetEvent(ev)
                );
            };

            this.showAbout = function(ev) {
                $mdDialog.show({
                    controller: 'aboutCtrl',
                    templateUrl: 'html/about.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true
                });
            };

            this.addFile = function() {
                videosManager.selectFile().then(function(path) {
                    let files = path.split(';');
                    _.each(files, function(file, i) {
                        let video = new h265ize.Video(file);
                        videosManager.addVideo(video);
                    });
                });
            };

            this.addDirectory = function() {
                videosManager.selectDirectory().then(function(path) {
                    recursive(path, function(err, files) {

                        let videos = [];

                        // Handle any errors given while searching input directory
                        if (err) {
                            if (err.code === 'ENOENT')
                                return new Error('File or directory ' + path + ' does not exist.');
                            else
                                throw err;
                        }


                        // Check if each file is a video
                        _.each(files, function(file) {
                            if (mime.lookup(file).startsWith('video/'))
                                videos.push(file);
                        });

                        _.each(videos, function(file, i) {
                            let video = new h265ize.Video(file);
                            videosManager.addVideo(video);
                        });
                    });
                });
            };


        })
        .controller('ToastCtrl', function($rootScope, $scope, $mdToast, text) {
            $scope.text = text;
            $scope.closeToast = function() {
                $mdToast.hide();
            };
            $scope.$on('$destroy', function() {
                delete $rootScope.currentToast;
                $rootScope.queueToast($rootScope.toastQueue.shift());
            });
        })
        .controller('logSheetController', function($scope) {
            $scope.logLevels = {
                error: 0,
                warn: 1,
                alert: 2,
                info: 3,
                verbose: 4,
                debug: 5
            };
        })
        .controller('preferencesCtrl', function($scope, $mdDialog) {
            $scope.themes = [
                'red',
                'pink',
                'purple',
                'deep-purple',
                'indigo',
                'blue',
                'light-blue',
                'cyan',
                'teal',
                'green',
                'light-green',
                'lime',
                'yellow',
                'amber',
                'orange',
                'deep-orange',
                'brown',
                'grey',
                'blue-grey'
            ];
            $scope.cpus = OS.cpus();
            $scope.maxThreads = $scope.cpus.length;

            $scope.hide = function() {
                $mdDialog.hide();
            };
            $scope.cancel = function() {
                $mdDialog.cancel();
            };
            $scope.answer = function(answer) {
                $mdDialog.hide(answer);
            };

            Models.Setting.find({}, function(err, docs) {
                let settings = _.reduce(docs, function(result, value, key) {
                    result[value.name] = value.value;
                    return result;
                }, {});
                _.extend($scope, settings);
                $scope.$applyAsync();
            });

            $scope.saveOnChange = function(modelName) {
                $scope.$watch(modelName, function(cur) {
                    if (typeof cur === 'undefined')
                        return;

                    Models.Setting.update({
                        name: modelName
                    }, {
                        name: modelName,
                        value: cur
                    }, {
                        upsert: true
                    });
                });
            };

            $scope.saveOnChange('threads');
            $scope.saveOnChange('showSplash');
            $scope.saveOnChange('theme');

        })
        .controller('aboutCtrl', function($scope, $mdDialog) {
            $scope.npmVersion = {};
            latest('h265ize', function(err, res) {
                $scope.$applyAsync(function() {
                    $scope.npmVersion.h265ize = res.version;
                });
            });
            latest('h265ize-gui', function(err, res) {
                $scope.$applyAsync(function() {
                    $scope.npmVersion.h265izeGui = res.version;
                });
            });

            $scope.cancel = function() {
                $mdDialog.cancel();
            };
        })
        .controller('addVideosCtrl', function($scope, videosManager, $rootScope, asPresetManager, $element) {
            $scope.numScanning = videosManager.scanning;
            $scope.videosManager = videosManager;

            videosManager.listenForUpdates($scope, $scope.videosManager);

            function updateAsPresets() {
                $scope.asPresets = asPresetManager.presets;
                $scope.$applyAsync();
            }

            $element.find('input').on('keydown', function(ev) {
                ev.stopPropagation();
            });

            $scope.asPresets = asPresetManager.presets;
            $scope.$watch('asPreset', function(cur) {
                if (!cur)
                    return;

                $scope.clonedOptions = _.clone($scope.asPreset.options);
            });
            $scope.asPreset = new Models.Preset();

            asPresetManager.events.on('update', updateAsPresets);

            $scope.clearList = function() {
                videosManager.beingAdded.length = 0;
            };

            $scope.addFilesToQueue = function() {
                let numVideos = $scope.videosManager.beingAdded.length;
                if (numVideos < 1) {
                    return $rootScope.queueToast({
                        hideDelay: 3000,
                        locals: {
                            text: 'No videos in list.'
                        },
                        toastClass: 'toast-error',
                        position: 'bottom left',
                        controller: 'ToastCtrl',
                        templateUrl: 'html/toastTemplate.html'
                    });
                }
                for (let vid of $scope.videosManager.beingAdded) {
                    let options = {};
                    _.defaults(options, $scope.clonedOptions, vid.options);
                    vid.options = options;
                    vid._updateDestination($scope.clonedOptions.destination);
                    $scope.videosManager.addVideoToProcessingQueue(vid);
                }
                videosManager.beingAdded.length = 0;
                $rootScope.queueToast({
                    hideDelay: 3000,
                    locals: {
                        text: numVideos + ' video' + (numVideos > 1 ? 's' : '') + ' added to queue.'
                    },
                    toastClass: 'unclosable',
                    position: 'bottom left',
                    controller: 'ToastCtrl',
                    templateUrl: 'html/toastTemplate.html'
                });
            };

            $scope.remove = function(video) {
                videosManager.remove(video, 'beingAdded');
            };

            $scope.$on('$destroy', function() {
                asPresetManager.events.removeListener('update', updateAsPresets);
            });
        })
        .controller('queueCtrl', function($scope, $rootScope, videosManager) {
            $scope.videos = $rootScope.Encoder.queue;
            $scope.currentlyProcessing = function() {
                return $rootScope.Encoder.currentlyProcessing;
            };

            videosManager.listenForUpdates($scope, $scope.videosManager);

            $scope.remove = function(video) {
                $scope.$applyAsync(function() {
                    $rootScope.Encoder.removeVideo(video);
                });
            };
        })
        .controller('processedVideosCtrl', function($scope, $rootScope, videosManager) {
            $scope.videosManager = videosManager;

            videosManager.listenForUpdates($scope, $scope.videosManager);
        })
        .controller('logCtrl', function($scope, $mdBottomSheet, logger) {
            $scope.messages = logger.log;
            let isScrolledToBottom = false;

            function newMessageHandler() {
                if (isScrolledToBottom)
                    window.scrollTo(0, (document.documentElement && document.documentElement.scrollHeight) || document.body.scrollHeight);
                $scope.$applyAsync();
            }
            logger.events.on('new message', newMessageHandler);

            $scope.$on('$destroy', function() {
                logger.events.removeListener('new message', newMessageHandler);
            });

            $scope.logLevel = 3;

            $scope.showBottomSheet = function() {
                $scope.bottomSheet = $mdBottomSheet.show({
                    scope: $scope, // use parent scope in template
                    preserveScope: true,
                    templateUrl: "html/logBottomSheet.html",
                    controller: 'logSheetController',
                    //                            disableBackdrop: true
                });
            };

            function scrollHandler(e) {
                console.log(e);
            }

            //                    $rootScope.$on('$stateChangeStart', function () {
            //                        document.querySelector('md-content[ui-view]').removeListener("wheel", scrollHandler);
            //                    });
            //                    $scope.$on('$viewContentLoaded', function () {
            //                        document.querySelector('md-content[ui-view]').addEventListener("wheel", scrollHandler);
            //                    });
        })
        .controller('presetManagerCtrl', function($scope, asPresetManager, $mdColors) {
            $scope.presetManager = asPresetManager;
            $scope.asPresets = asPresetManager.presets;

            $scope.activeBackground = $mdColors.getThemeColor('default-' + settings.theme + '-500-0.5');

            $scope.update = function() {
                $scope.asPresets = asPresetManager.presets;
                $scope.$applyAsync();
            };

            function deleteHandler() {
                delete $scope.selected;
                $scope.update();
            }

            asPresetManager.events.on('update', $scope.update);

            asPresetManager.events.on('delete', deleteHandler);

            $scope.$watch('selected', function(cur, old) {
                if (!cur || cur.type === 'default')
                    return;

                let savedValues = {
                    $$hashKey: cur.$$hashKey,
                    $$mdSelectId: cur.$$mdSelectId
                };
                delete cur.$$hashKey;
                delete cur.$$mdSelectId;

                cur.save(function() {
                    cur.$$hashKey = savedValues.$$hashKey;
                    cur.$$mdSelectId = savedValues.$$mdSelectId;
                });
            }, true);

            $scope.$on('$destroy', function() {
                asPresetManager.events.removeListener('delete', $scope.update);
                asPresetManager.events.removeListener('delete', deleteHandler);
            });
        })
        .service('Tour', function($compile, $rootScope, $timeout, $state) {
            class Step {
                constructor(options) {
                    this.target = options.target;
                    this.title = options.title || '';
                    this.text = options.text || '';
                    this.imagePath = options.imagePath;
                    this.deactiveated = options.deactiveated;
                    this.forceNoOverlay = options.forceNoOverlay;
                    this.before = options.before;
                    this.state = options.state;
                }
            }
            class Tour {
                constructor(options) {
                    this.steps = [];
                    this.visible = false;
                    this.scope = $rootScope.$new();
                    _.extend(this.scope, {
                        previous: () => {
                            this.previous();
                        },
                        next: () => {
                            this.next();
                        },
                        close: () => {
                            this.close();
                        },
                        steps: this.steps,
                        currentStepNum: this._currentStepNum
                    });
                    this.defaults = _.defaults(options.defaults, {
                        template: `<md-card>
          <img ng-src="{{imagePath | localImage}}" ng-if="imagePath" class="md-card-image">
        <md-card-title ng-if="title" md-colors="::{background: 'default-primary-500'}">
          <md-card-title-text>
            <span class="md-headline">{{title}}</span>
          </md-card-title-text>
        </md-card-title>
        <md-card-content ng-if="text">
          <p>
            {{text}}
          </p>
        </md-card-content>
        <md-card-actions layout="row" layout-align="end center">
            <span class="ng-tour-step-num md-caption">{{currentStepNum + 1}}/{{steps.length}}</span>
          <md-button class="md-icon-button" aria-label="Previous" ng-click="previous()" title="Previous Step" ng-disabled="currentStepNum - 1 < 0">
            <fa name="chevron-left"></fa>
          </md-button>
          <md-button class="md-icon-button" aria-label="Next" ng-click="next()" title="Next Step" ng-disabled="currentStepNum + 1 >= steps.length">
            <fa name="chevron-right"></fa>
          </md-button>
          <md-button class="md-icon-button" aria-label="Close" ng-click="close()" title="End Tour">
            <fa name="close"></fa>
          </md-button>
        </md-card-actions>
      </md-card>`
                    });

                    if (options) {
                        if (options.steps) {
                            for (let step of options.steps) {
                                this.steps.push(_.defaults(new Step(step), this.defaults));
                            }
                        }
                    }
                    this._currentStepNum = 0;
                }

                addStep(step) {
                    this.steps.push(step);
                }

                start() {
                    this._createElements();
                    angular.element(document.body).addClass('ng-tour');
                    console.debug('Showing step:', this.steps[this._currentStepNum]);
                    this._showStep(this.steps[this._currentStepNum]);
                    this.visible = true;
                }

                previous() {
                    if (this._currentStepNum - 1 >= 0) {
                        this._showStep(this.steps[--this._currentStepNum]);
                    }
                }

                next() {
                    if (this._currentStepNum + 1 < this.steps.length) {
                        this._showStep(this.steps[++this._currentStepNum]);
                    } else
                        this.close();
                }

                close() {
                    this._removeElements();
                    angular.element(document.body).removeClass('ng-tour');
                    this.visible = false;
                }

                _createElements() {
                    this.backdrops = {
                        top: angular.element(document.createElement('div')).addClass('ng-tour-backdrop ng-tour-backdrop-top'),
                        bottom: angular.element(document.createElement('div')).addClass('ng-tour-backdrop ng-tour-backdrop-bottom'),
                        left: angular.element(document.createElement('div')).addClass('ng-tour-backdrop ng-tour-backdrop-left'),
                        right: angular.element(document.createElement('div')).addClass('ng-tour-backdrop ng-tour-backdrop-right')
                    };

                    this.highlighter = angular.element(document.createElement('div')).addClass('ng-tour-highlighter');

                    angular.element(document.body)
                        .append(this.backdrops.top)
                        .append(this.backdrops.bottom)
                        .append(this.backdrops.left)
                        .append(this.backdrops.right)
                        .append(this.highlighter)
                        .append(this.informational);
                }

                _removeElements() {
                    this.backdrops.top.remove();
                    this.backdrops.bottom.remove();
                    this.backdrops.left.remove();
                    this.backdrops.right.remove();
                    this.highlighter.remove();
                    if (this.informational)
                        this.informational.remove();
                }

                _showStep(step) {
                    if (this.informational)
                        this.informational.remove();
                    let _self = this;
                    if (step.state && $state.current.name !== step.state) {
                        new Promise(function(resolve, reject) {
                            let listener = $rootScope.$on('$viewContentLoaded', function() {
                                resolve();
                                listener();
                            });
                            $state.go(step.state);
                        }).then(resume);
                    } else
                        resume();

                    function resume() {
                        if (step.before)
                            step.before().then(resume2);
                        else
                            resume2();
                    }

                    function resume2() {

                        _self.scope.title = step.title;
                        _self.scope.text = step.text;
                        _self.scope.imagePath = step.imagePath;
                        _self.scope.currentStepNum = _self._currentStepNum;
                        let target = document.querySelector(step.target);

                        let bounds;
                        let targetFound = false;
                        let targetInWindow = false;
                        if (target) {
                            targetFound = true;
                            let targetElement = angular.element(target);
                            bounds = targetElement[0].getBoundingClientRect();

                            if (bounds.top > window.innerHeight || bounds.top < 0 ||
                                bounds.left > window.innerWidth || bounds.left < 0) {
                                targetInWindow = false;
                                console.warn(new Error(step.target + ' target not within scrollable window!'));

                                // createFakeBounds
                                let halfWindowWidth = window.innerWidth / 2;
                                let halfWindowHeight = window.innerHeight / 2;
                                bounds = {
                                    width: 0,
                                    height: 0,
                                    left: halfWindowWidth,
                                    right: halfWindowWidth,
                                    top: halfWindowHeight,
                                    bottom: halfWindowHeight,
                                    absBottom: halfWindowHeight,
                                    absRight: halfWindowWidth
                                };
                            } else {
                                targetInWindow = true;

                                targetElement.addClass('ng-tour-target');

                                bounds.absBottom = window.innerHeight - bounds.bottom;
                                bounds.absRight = window.innerWidth - bounds.right;

                                if (bounds.top > bounds.absBottom) {
                                    // Closer to bottom
                                }
                                if (bounds.left > bounds.absRight) {
                                    // Closer to right
                                }
                            }
                        } else {
                            // TODO: Center correctly
                            console.warn(new Error(step.target + ' target not found!'));

                            // createFakeBounds
                            let halfWindowWidth = window.innerWidth / 2;
                            let halfWindowHeight = window.innerHeight / 2;
                            bounds = {
                                width: 0,
                                height: 0,
                                left: halfWindowWidth,
                                right: halfWindowWidth,
                                top: halfWindowHeight,
                                bottom: halfWindowHeight,
                                absBottom: halfWindowHeight,
                                absRight: halfWindowWidth
                            };
                        }

                        // Top backdrop
                        _self.backdrops.top.css('height', bounds.top + 'px');

                        // Bottom backdrop
                        _self.backdrops.bottom.css('height', bounds.absBottom + 'px');

                        // Left backdrop
                        _self.backdrops.left.css('top', bounds.top + 'px').css('width', bounds.left + 'px').css('height', bounds.height + 'px');

                        // Right backdrop
                        _self.backdrops.right.css('top', bounds.top + 'px').css('width', bounds.absRight + 'px').css('height', bounds.height + 'px');

                        // Highlighter
                        _self.highlighter.css('top', bounds.top + 'px').css('left', bounds.left + 'px').css('width', bounds.width + 'px').css('height', bounds.height + 'px');

                        if (!step.deactivated)
                            _self.highlighter.addClass('deactiveated');

                        let informational = $compile(step.template)(_self.scope);
                        _self.informational = informational.addClass('ng-tour-informational');

                        if (!targetFound) {
                            _self.informational.addClass('ng-tour-target-not-found');
                        }
                        if (step.allowWide) {
                            _self.informational.addClass('ng-tour-allow-wide');
                        }

                        angular.element(document.body)
                            .append(_self.informational);

                        // Wait for informational to be appended to body, then do
                        // positioning
                        $timeout(function() {
                            if (targetFound && targetInWindow)
                                alignRelativeToTarget(bounds);
                            else
                                alignCenter(bounds);
                        });
                    }

                    function alignRelativeToTarget(bounds) {
                        // Try fitting on the right
                        if ((bounds.right + 10 + bounds.width) < window.innerWidth) {
                            _self.informational.css('left', (bounds.right + 10) + 'px');
                        }
                        // The left?
                        else if ((bounds.left - 10 - _self.informational[0].offsetWidth) >= 0) {
                            _self.informational.css('left', (bounds.left - 10 - _self.informational[0].offsetWidth) + 'px');
                        } else {
                            _self.informational.css('left', '0px');
                            _self.informational.overlapping = true;
                        }

                        // Force to bottom
                        if (bounds.top + _self.informational[0].offsetHeight > window.innerHeight) {

                            _self.informational.css('bottom', '0px');
                        }
                        //
                        else {
                            _self.informational.css('top', bounds.top + 'px');
                        }

                        _self.informational.addClass('visible');
                    }

                    function alignCenter(bounds) {
                        _self.informational.css('left', (bounds.left - _self.informational[0].offsetWidth / 2) + 'px')
                            .css('top', (bounds.top - _self.informational[0].offsetHeight / 2) + 'px');

                        _self.informational.addClass('visible');
                    }

                    function attemptToClearOverlap() {
                        // TODO: Clear overlap if possible
                    }
                }
            }

            return Tour;
        })
        .filter('sanitizeStateName', function() {
            return function(input) {
                return input.substr(0, input.length - 5)
                    //https://stackoverflow.com/questions/4149276/javascript-camelcase-to-regular-form
                    // insert a space before all caps
                    .replace(/([A-Z])/g, ' $1');
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
        })
        .factory('videosManager', function($rootScope, logger) {
            let f = {
                beingAdded: [],
                finished: [],
                failed: [],
                scanning: 0
            };

            // This set of code can be used to update listening scopes when the
            // factory calls the update function
            let listeningScopes = [];
            f.listenForUpdates = function(scope, objToUpdate) {
                listeningScopes.push([scope, objToUpdate]);
                scope.$on('$destroy', function() {
                    _.pull(listeningScopes, scope);
                });
            };
            let update = function() {
                _.each(listeningScopes, function(scopeSet) {
                    let scope = scopeSet[0],
                        obj = scopeSet[1];
                    scope.$applyAsync(function() {
                        if (typeof obj !== 'undefined')
                            obj = f;
                    });
                });
            };

            f.addVideo = function(video) {
                f.scanning++;
                let idx = f.beingAdded.push(video) - 1;
                video = f.beingAdded[idx];
                update();
                ffmpeg(video.path)
                    .ffprobe(function(err, data) {
                        if (err) {
                            f.scanning--;
                            f.remove(video, 'beingAdded');
                            $rootScope.queueToast({
                                hideDelay: 3000,
                                locals: {
                                    text: video.base + ' is not a valid video file.'
                                },
                                toastClass: 'toast-error',
                                position: 'bottom left',
                                controller: 'ToastCtrl',
                                templateUrl: 'html/toastTemplate.html'
                            });
                            logger.warn(video.base, 'could not be added because of an ffprobe processing error.');
                            logger.debug('ffprobe error:', err);
                            return console.warn(video, 'could not be added because of an ffprobe processing error:', err);
                        }

                        video.metadata = data;

                        // Decide video type
                        let duration = data.format.duration;
                        if (duration > 60 * 60) {
                            video.type = 'Movie';
                            video.typeIconName = 'film';
                        } else {
                            video.type = 'Show';
                            video.typeIconName = 'television';
                        }

                        // Get primary video stream
                        for (let stream of video.metadata.streams) {
                            if (stream.codec_type === 'video') {
                                video.videoStream = stream;
                                break;
                            }
                        }

                        // Check if progressive or interlaced
                        let framesToScan = 150;
                        let scanCommand = ffmpeg(video.path).videoFilters('idet').frames(framesToScan).outputOptions('-map v')
                            .format('rawvideo').outputFormat('null').output('-').on('end', function(stdout, stderr) {
                                let lines = stderr.split('\n');
                                let lastLine = lines[lines.length - 2].replace(/ /g, '');
                                let numFrames = lastLine.match(new RegExp('TFF:([0-9]+)BFF:([0-9]+)Progressive:([0-9]+)'));
                                let interlacedFrameCount = parseInt(numFrames[1]) + parseInt(numFrames[2]);
                                let progressiveFrameCount = parseInt(numFrames[3]);

                                if (interlacedFrameCount >= progressiveFrameCount) {
                                    video.metadata.format.interlaced = true;
                                } else
                                    video.metadata.format.interlaced = false;

                                f.scanning--;
                                update();
                            }).run();
                    });
            };

            f.addVideoToProcessingQueue = function(video) {
                $rootScope.Encoder.addVideo(video);
            };

            f.remove = function(video, queue) {
                _.pull(f[queue], video);
            };

            const finishHandler = function(video) {
                f.finished.push(video);
                update();
            };
            const failedHandler = function(video) {
                f.failed.push(video);
                update();
            };
            const stopHandler = function(video) {
                update();
            };

            function watchVideo(video) {
                video.events
                    // Add handlers
                    .on('progress', update)
                    .on('finished', function(video) {
                        console.log(video.path, 'finished successfully.');
                        finishHandler(video);
                    })
                    .on('failed', function() {
                        console.warn(video.path, 'failed to process.');
                        failedHandler(video);
                    })
                    .on('stopped', function() {
                        stopHandler(video);
                    })
                    .on('stage', update);
            }

            $rootScope.Encoder.events.on('processing', function(video) {
                watchVideo(video);
            });

            f.selectFile = function() {
                return chooseFile('#filePathDialog');
            };

            f.selectDirectory = function() {
                return chooseFile('#fileDirectoryDialog');
            };

            $rootScope.Encoder.events
                .on('processing', update);

            function chooseFile(name) {
                return new Promise(function(resolve, reject) {
                    var chooser = document.querySelector(name);
                    let fileHandler = function(evt) {
                        resolve(this.value);
                        chooser.removeEventListener("change", fileHandler);
                        chooser.value = '';
                    };
                    chooser.addEventListener("change", fileHandler);
                    chooser.click();
                });
            }

            return f;
        })
        .factory('asPresetManager', function() {

            let f = {
                presets: []
            };

            f.events = new EventEmitter();

            f.create = function(options) {
                options = options ? options : {};
                let idx = f.presets.push(new Models.Preset(options));
                return f.presets[idx - 1];
            };

            // Add default anime preset
            f.create({
                name: 'anime',
                description: "Used to encode low movement anime.",
                type: 'default',
                options: {
                    quality: 19,
                    preset: 'medium',
                    extraOptions: 'allow-non-conformance:ref=8:bframes=8:rd=6:me=star:b-adapt=2:qg-size=64:rc-lookahead=40:scenecut=45:weightb=1:psy-rd=2.0'
                }
            });

            f.delete = function(preset) {
                for (let i = 0; i < f.presets.length; i++) {
                    if (f.presets[i] === preset)
                        f.presets.splice(i, 1);
                }
                preset.remove();
                f.events.emit('delete');
            };

            Models.Preset.find({}, function(err, docs) {
                f.presets = f.presets.concat(docs);
                f.events.emit('update');
            });

            return f;
        })
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
                            msg[v] = createListString(msg[v]).replace(/\n/g, '<br />');
                        }
                    }

                    let message = {
                        level: level,
                        //                        text: $sce.trustAsHtml(convert.toHtml(Array.from(msg).join(' '))),
                        text: Array.from(msg).join(' '),
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
        })
}

function createListString(files) {
    if (Array.isArray(files))
        return '\n\t- ' + files.join('\n\t- ');

    let array = [];
    _.each(files, function(value, key) {
        array.push(key + ': ' + value);
    });
    return '\n\t- ' + array.join('\n\t- ');
}
