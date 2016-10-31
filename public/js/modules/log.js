angular.module('logModule', ['loggerModule'])
.controller('logCtrl', function($scope, logger) {
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
