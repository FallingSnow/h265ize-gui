angular.module('normalizationModule', ['ngMaterial'])
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
});
