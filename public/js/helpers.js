const recursive = require('recursive-readdir');

module.exports.getVideosFromDir = function(path) {
    recursive(path, function(err, files) {

        let videos = [];

        // Handle any errors given while searching input directory
        if (err) {
            if (err.code === 'ENOENT')
                return new Error('File or directory ' + path + ' does not exist.');
            else
                throw err;
        }


        // Check if each file is a video
        _.each(files, function(file) {
            if (mime.lookup(file).startsWith('video/'))
                videos.push(file);
        });

        return videos;
    });
}

module.exports.createListString = function(array) {
    if (Array.isArray(array))
        return '\n\t- ' + array.join('\n\t- ');

    let a = [];
    _.each(array, function(value, key) {
        a.push(key + ': ' + value);
    });
    return '\n\t- ' + a.join('\n\t- ');
}
