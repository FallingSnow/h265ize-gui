angular.module('toastModule', ['ngMaterial'])
    .controller('ToastCtrl', function($rootScope, $scope, $mdToast, text) {
        $scope.text = text;
        $scope.closeToast = function() {
            $mdToast.hide();
        };
        $scope.$on('$destroy', function() {
            delete $rootScope.currentToast;
            $rootScope.queueToast($rootScope.toastQueue.shift());
        });
    });
