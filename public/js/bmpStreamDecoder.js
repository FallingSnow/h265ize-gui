const Bmp = require("bmp-js");

class Image extends EventEmitter {
    constructor(chunk) {
        super();
        this.fileSize = chunk.readUInt32LE(2);
        this.buffer = Buffer.alloc(this.fileSize);
        chunk.copy(this.buffer);
        this.pos = chunk.length;
    }
    appendData(chunk) {
        chunk.copy(this.buffer, this.pos);
        this.pos += chunk.length;
        if (this.pos === this.buffer.length) {
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
                _self.emit('imageDecoded', Object.assign({}, data));
                _self.image.destroy();
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
