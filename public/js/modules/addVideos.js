angular.module('addVideosModule', ['videosManagerModule', 'presetManagerModule', 'encoderSettingsModule', 'loggerModule'])
    .controller('addVideosCtrl', function($rootScope, $scope, $element, videosManager, presetManager, logger) {
        $scope.numScanning = videosManager.scanning;
        $scope.videosManager = videosManager;

        videosManager.listenForUpdates($scope, $scope.videosManager);

        function updateAsPresets() {
            $scope.asPresets = presetManager.presets;
            $scope.$applyAsync();
        }

        $element.find('input').on('keydown', function(ev) {
            ev.stopPropagation();
        });

        $scope.asPresets = presetManager.presets;
        $scope.$watch('asPreset', function(cur) {
            if (!cur)
                return;

            $scope.clonedOptions = _.clone($scope.asPreset.options);
        });

        $scope.asPreset = new Models.Preset();
        if (localStorage.preset)
            presetManager.find(localStorage.preset, function(preset) {
                if (preset)
                    $scope.$applyAsync(function() {
                        $scope.asPreset = preset;
                    });
            });

        $scope.$watch('asPreset', function(cur) {
            if (cur)
                localStorage.preset = cur.name;
        });

        presetManager.events.on('update', updateAsPresets);

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
                if (vid.videoStream.codec_name === 'hevc' && !vid.options.override) {
                    numVideos--;
                    logger.warn(vid.base, 'was not added to processing queue because video is already encoded in hevc and override was not enabled.');
                    console.warn(vid, 'was not added to processing queue because video is already encoded in hevc and override was not enabled.');
                    continue;
                }
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

        let dropZone = document.getElementById('videoList');
        dropZone.ondragover = function() {
            $scope.$applyAsync(function() {
                $scope.dragging = true;
            });
            return false;
        };
        dropZone.ondragleave = function() {
            $scope.$applyAsync(function() {
                $scope.dragging = false;
            });
            return false;
        };
        dropZone.ondrop = function(e) {
            e.preventDefault();
            $scope.$applyAsync(function() {
                $scope.dragging = false;
            });

            let files = e.dataTransfer.files;

            handleDrop(files);
            return false;
        };

        function handleDrop(files) {
            _.each(files, function(file) {
                h265ize._helpers.parseInput(file.path).then(function(videoPaths) {
                    _.each(videoPaths, function(videoPath, i) {
                        let video = new h265ize.Video(videoPath);
                        videosManager.addVideo(video);
                    });
                });
            });
        }

        $scope.remove = function(video) {
            videosManager.remove(video, 'beingAdded');
        };

        $scope.$on('$destroy', function() {
            presetManager.events.removeListener('update', updateAsPresets);
        });
    })
