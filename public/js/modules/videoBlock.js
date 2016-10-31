angular.module('videoBlockModule', [])
.controller('videoBlockCtrl', function($scope, $element) {
    $scope.previewPadding = 0;
    let canvas = $element[0].querySelector('.input-video');
    let ctx = canvas.getContext("2d");

    if ($scope.video.currentStage.name === 'Encode') {
        generatePreview();
    }

    function generatePreview() {
        $scope.streamDecoder = new bmpStreamDecoder($scope.video.previewStream)
            .once('imageDecoded', function(image) {
                // Set padding for preview video
                let padding = image.width - 70;
                $scope.$applyAsync(function() {
                    $scope.previewPadding = padding;
                })
            })
            .on('imageDecoded', function(image) {
                let imageData = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.putImageData(imageData, 0, 0);
            });
    }

    $scope.$on('$destroy', function() {
        if ($scope.streamDecoder)
            $scope.streamDecoder.destroy();
    })

    function watchForEncodeStage(stage) {
        if (stage === 'Encode') {
            $scope.video.events.removeListener('stage', watchForEncodeStage);
            generatePreview();
        }
    }
    $scope.video.events.on('stage', watchForEncodeStage);
})
.directive('videoBlock', function() {
    return {
        restrict: 'E',
        controller: 'videoBlockCtrl',
        replace: true,
        templateUrl: 'html/videoBlock.html',
        scope: {
            video: '=',
        }
    };
});
