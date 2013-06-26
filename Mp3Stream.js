var path = require('path'), 
    fs = require('fs'),
    stream = require('stream');
    
var PADDING_MASK = 0x0000200,
    SYNC_MASK = 0xFFF00000,
    MP3_SIGNATURE = 0x000A0000,
    SAMPLES_PER_FRAME = 1152, // from ISO11172
    SAMPLING_FREQUENCY = 44100,
    SECONDS_PER_FRAME = SAMPLES_PER_FRAME / SAMPLING_FREQUENCY;

var DEBUG = false;
/*
    Generates a readable stream of mp3 frames from mp3 file in 'mp3Path'
*/
var Mp3Stream = function(mp3Path, options){

    if (!(this instanceof Mp3Stream))
        return new Mp3Stream(mp3Path, options);
    stream.Readable.call(this, options);

    this.offset = 0;
    var self = this;

    fs.readFile(mp3Path, function(error, data){
        if (error) {
            self.emit('error', error);
            self.push(null);
            return;
        }
        self._source = data;
        if (DEBUG) console.log("File length:", data.length);
        // Start to split the _source, allowing 'readable' events to be fired
        // again, after being fired when the listener on 'readable' was
        // installed
        self.read(0);
    });
};

// Heritage as Node doc examples suggest
Mp3Stream.prototype = Object.create(
    stream.Readable.prototype, { constructor: { value: Mp3Stream }});

/*
    stream.Readable must implement stream._read()
*/
Mp3Stream.prototype._read = function(size){
   // If _source is not ready yet. Needed as _source availability is async and
   // installing on() on 'readable' makes this event to be fired once:
   // https://github.com/joyent/node/blob/master/lib/_stream_readable.js#L691 
   if (!this._source) {
       this.push('');
       return;
   }

   if(this.offset >= this._source.length){
        this.push(null);
        return;
    }

    var frameHeader;
    var synced = false;
    try{
        while (~synced) {
            frameHeader = this._source.readUInt32BE(this.offset++);
            synced = (frameHeader & SYNC_MASK) >> 20;
            var mp3 = (frameHeader & MP3_SIGNATURE) >> 17;
            if (mp3 != 5) synced = false;
        }
    } catch(e){
        // Out of Bounds Error: sync not found in whole file
    
        // Maybe last frame is not synced and when trying to read it, it 
        // generates an OoBE but the whole song has been read correctly. 
        // Checking it here.
        if (this.offset + 2 < this._source.length) {
            if (DEBUG) console.log("Cannot sync whole file, next one, please.\n", e);
            this.emit('error', e);
        }
        this.push(null);
        return;
    }	
    
    this.emit('synced', frameHeader);
    
    var padding = !!(frameHeader & PADDING_MASK);
    var frameLength = 417 + padding;
    try{
        var frame = this._source.slice(this.offset - 1, this.offset - 1 + frameLength);
        this.offset += frameLength - 1; 
        if (DEBUG) console.log("New offset calculated", this.offset);
        var self = this;
        setTimeout(function(){
            if (DEBUG) console.log('Frame pushed');
            self.push(frame);
        }, SECONDS_PER_FRAME * 1000);
    } catch(e) {
    // Out of Bounds Error: it was the last frame in file, so finished
        this.push(null);
        this.emit('error', e);
        return;
    }
}

module.exports = exports.Mp3Stream = Mp3Stream;
