angular.module('menuModule', ['aboutModule', 'statusModule', 'videosManagerModule'])
    .controller('MenuCtrl', function($mdDialog, videosManager) {
        this.sampleAction = function(name, ev) {
            $mdDialog.show($mdDialog.alert()
                .title(name)
                .textContent('You triggered the "' + name + '" action')
                .ok('Great')
                .targetEvent(ev)
            );
        };

        this.showAbout = function(ev) {
            $mdDialog.show({
                controller: 'aboutCtrl',
                templateUrl: 'html/about.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true
            });
        };

        this.showStatus = function(ev) {
            $mdDialog.show({
                controller: 'statusCtrl',
                templateUrl: 'html/status.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true
            });
        };

        this.addFile = function() {
            videosManager.selectFile().then(function(path) {
                let files = path.split(';');
                _.each(files, function(file, i) {
                    let video = new h265ize.Video(file);
                    videosManager.addVideo(video);
                });
            });
        };

        this.addDirectory = function() {
            videosManager.selectDirectory().then(function(path) {
                h265ize._helpers.parseInput(path).then(function(videoPaths) {
                    _.each(videoPaths, function(videoPath, i) {
                        let video = new h265ize.Video(videoPath);
                        videosManager.addVideo(video);
                    });
                });
            });
        };
    });
