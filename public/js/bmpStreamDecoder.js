const Bmp = require("bmp-js");

class Image extends EventEmitter {
    constructor(chunk) {
        super();
        this.buffer = chunk;
        this.length = chunk.length;
        this.fileSize = this.buffer.readUInt32LE(2);
    }
    appendData(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.length += chunk.length;
        if (this.length === this.fileSize) {
            this.end();
        }
    }
    end() {
        this.data = Bmp.decode(this.buffer);
        this.emit('decoded', this.data);
    }
    destroy() {
        this.removeAllListeners('decoded');
        delete this;
    }
}

class StreamDecoder extends EventEmitter {
    constructor(stream) {
        super();
        this.image = null;
        this.stream = stream.on('data', this.chunkHandler.bind(this));
    }
    chunkHandler(chunk) {
        if (chunk.toString("utf-8", 0, 2) === 'BM') {
            if (this.image)
                this.image.end();

            this.image = new Image(chunk);
            let _self = this;
            this.image.on('decoded', (data) => {
                _self.emit('imageDecoded', data);
            });
        } else {
            this.image.appendData(chunk);
        }
    }
    destroy() {
        if (this.image) {
            this.image.destroy();
        }
        this.stream.removeListener('data', this.chunkHandler);
        this.removeAllListeners('imageDecoded');
        delete this;
    }
}

module.exports = StreamDecoder;
