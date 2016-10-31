angular.module('presetManagerModule', [])
    .factory('presetManager', function() {

        let f = {
            presets: []
        };

        f.events = new EventEmitter();

        f.create = function(options) {
            options = options ? options : {};
            let idx = f.presets.push(new Models.Preset(options));
            return f.presets[idx - 1];
        };

        // Add default anime preset
        f.create({
            name: 'anime',
            description: "Used to encode low movement anime.",
            type: 'default',
            options: {
                quality: 19,
                preset: 'medium',
                extraOptions: 'allow-non-conformance:ref=8:bframes=8:rd=6:me=star:b-adapt=2:qg-size=64:rc-lookahead=40:scenecut=45:weightb=1:psy-rd=2.0'
            }
        });

        f.delete = function(preset) {
            for (let i = 0; i < f.presets.length; i++) {
                if (f.presets[i] === preset)
                    f.presets.splice(i, 1);
            }
            preset.remove();
            f.events.emit('delete');
        };

        Models.Preset.find({}, function(err, docs) {
            f.presets = f.presets.concat(docs);
            f.events.emit('update');
        });

        return f;
    })
.controller('presetManagerCtrl', function($rootScope, $scope, $mdColors, presetManager) {
    $scope.presetManager = presetManager;
    $scope.asPresets = presetManager.presets;

    $scope.activeBackground = $mdColors.getThemeColor('default-' + $rootScope.settings.theme + '-500-0.5');

    $scope.update = function() {
        $scope.asPresets = presetManager.presets;
        $scope.$applyAsync();
    };

    function deleteHandler() {
        delete $scope.selected;
        $scope.update();
    }

    presetManager.events.on('update', $scope.update);

    presetManager.events.on('delete', deleteHandler);

    $scope.$watch('selected', function(cur, old) {
        if (!cur || cur.type === 'default')
            return;

        let savedValues = {
            $$hashKey: cur.$$hashKey,
            $$mdSelectId: cur.$$mdSelectId
        };
        delete cur.$$hashKey;
        delete cur.$$mdSelectId;

        cur.save(function() {
            cur.$$hashKey = savedValues.$$hashKey;
            cur.$$mdSelectId = savedValues.$$mdSelectId;
        });
    }, true);

    $scope.$on('$destroy', function() {
        presetManager.events.removeListener('delete', $scope.update);
        presetManager.events.removeListener('delete', deleteHandler);
    });
});
