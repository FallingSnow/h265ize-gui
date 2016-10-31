angular.module('statusModule', [])
    .controller('statusCtrl', function($scope, $mdDialog) {

        $scope.statuses = {
            Encoder: {
                'Nvidia GPU Encoding': false
            }
        }

        $scope.cancel = function() {
            $mdDialog.cancel();
        };
    });
