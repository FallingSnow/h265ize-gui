angular.module('preferencesModule', [])
    .controller('preferencesCtrl', function($scope, $mdDialog) {
        $scope.themes = [
            'red',
            'pink',
            'purple',
            'deep-purple',
            'indigo',
            'blue',
            'light-blue',
            'cyan',
            'teal',
            'green',
            'light-green',
            'lime',
            'yellow',
            'amber',
            'orange',
            'deep-orange',
            'brown',
            'grey',
            'blue-grey'
        ];
        $scope.cpus = OS.cpus();
        $scope.maxThreads = $scope.cpus.length;

        $scope.hide = function() {
            $mdDialog.hide();
        };
        $scope.cancel = function() {
            $mdDialog.cancel();
        };
        $scope.answer = function(answer) {
            $mdDialog.hide(answer);
        };

        Models.Setting.find({}, function(err, docs) {
            let settings = _.reduce(docs, function(result, value, key) {
                result[value.name] = value.value;
                return result;
            }, {});
            _.extend($scope, settings);
            $scope.$applyAsync();
        });

        $scope.saveOnChange = function(modelName) {
            $scope.$watch(modelName, function(cur) {
                if (typeof cur === 'undefined')
                    return;

                Models.Setting.update({
                    name: modelName
                }, {
                    name: modelName,
                    value: cur
                }, {
                    upsert: true
                });
            });
        };

        $scope.saveOnChange('threads');
        $scope.saveOnChange('showSplash');
        $scope.saveOnChange('theme');

    })
