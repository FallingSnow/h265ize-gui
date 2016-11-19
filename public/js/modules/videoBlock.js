angular.module('videoBlockModule', [])
    .controller('videoBlockCtrl', function($scope, $element) {
        $scope.previewPadding = 0;
        let canvas = $element[0].querySelector('.input-video');
        let ctx = canvas.getContext("2d");
        $scope.streamDecoder = new bmpStreamDecoder($scope.video.previewStream)
            .once('imageDecoded', function(image) {
                // Set padding for preview video
                let padding = 60 / image.height * image.width - 70;
                canvas.width = image.width;
                canvas.height = image.height;
                $scope.$applyAsync(function() {
                    $scope.previewPadding = padding;
                })
                function enlargeCanvas() {
                    console.log('enlarging canvas')
                    canvas.style.height = image.height+"px";
                }
                function shrinkCanvas() {
                    canvas.style.height = "100%";
                }
                angular.element(canvas).on('mouseover', enlargeCanvas);
                angular.element(canvas).on('mouseout', shrinkCanvas);
            })
            .on('imageDecoded', function(image) {
                let imageData = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
                ctx.putImageData(imageData, 0, 0);
            });

        $scope.$on('$destroy', function() {
            if ($scope.streamDecoder)
                $scope.streamDecoder.destroy();
        });
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
