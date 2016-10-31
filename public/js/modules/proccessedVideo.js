angular.module('processedVideosModule', ['ngMaterial'])
    .controller('processedVideosCtrl', function($scope, $rootScope, videosManager) {
        $scope.videosManager = videosManager;

        videosManager.listenForUpdates($scope, $scope.videosManager);
    });
