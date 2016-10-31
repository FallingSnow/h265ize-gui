angular.module('videosManagerModule', ['loggerModule'])
    .factory('videosManager', function($rootScope, logger) {
        let f = {
            beingAdded: [],
            finished: $rootScope.Encoder.finishedVideos,
            failed: $rootScope.Encoder.failedVideos,
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
                                text: video.base + ' is not a valid video file. See the log tab for more details.'
                            },
                            toastClass: 'toast-error',
                            position: 'bottom left',
                            controller: 'ToastCtrl',
                            templateUrl: 'html/toastTemplate.html'
                        });
                        logger.warn(video.base, 'could not be added because of an ffprobe processing error. Details are displayed below in debug mode.');
                        logger.debug('ffprobe error:', err.message);
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
            for (let i in f[queue]) {
                if (f[queue][i].id === video.id) {
                    f[queue].splice(i, 1);
                }
            }
        };

        const finishHandler = function(video) {
            update();
        };
        const failedHandler = function(video) {
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
                .on('failed', function(video) {
                    console.warn(video.path, 'failed to process.');
                    failedHandler(video);
                })
                .on('stopped', function(video) {
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
    });
