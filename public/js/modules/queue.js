angular.module('queueModule', ['videosManagerModule'])
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
});
