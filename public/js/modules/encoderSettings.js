angular.module('encoderSettingsModule', ['videosManagerModule', 'normalizationModule'])
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
                $scope.options.heAudio = false;
            $scope.options.forceHeAudio = false;
            $scope.options.downmixHeAudio = false;
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
    });
