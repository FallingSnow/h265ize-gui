angular.module('aboutModule', ['ngMaterial'])
    .controller('aboutCtrl', function($scope, $mdDialog) {
        $scope.npmVersion = {};
        latest('h265ize', function(err, res) {
            $scope.$applyAsync(function() {
                $scope.npmVersion.h265ize = res.version;
            });
        });
        latest('h265ize-gui', function(err, res) {
            $scope.$applyAsync(function() {
                $scope.npmVersion.h265izeGui = res.version;
            });
        });

        $scope.cancel = function() {
            $mdDialog.cancel();
        };
    });
