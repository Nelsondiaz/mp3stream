var path = require('path'), 
    fs = require('fs'),
    stream = require('stream');
    
var PADDING_MASK = 0x0000200,
    SYNC_MASK = 0xFFF00000,
    MP3_SIGNATURE = 0x000A0000,
    SAMPLES_PER_FRAME = 1152, // from ISO11172
    SAMPLING_FREQUENCY = 44100,
    SECONDS_PER_FRAME = SAMPLES_PER_FRAME / SAMPLING_FREQUENCY;

/*
	Generates a readable stream of mp3 frames from mp3 files contained in
	'basedir'
*/
var Mp3Stream = function(mp3Path, options){
	if (!(this instanceof Mp3Stream))
		return new Mp3Stream(options);
	stream.Readable.call(this, options);

	this._source;
    this.offset = 0;
    var self = this;
    this.on('synced', function(frameHeader){
	    var padding = !!(frameHeader & PADDING_MASK);
	    var frameLength = 417 + padding;
	    try{
		    var frame = this._source.slice(this.offset - 1, this.offset - 1 + frameLength);
		    this.offset += frameLength - 1;
		    setTimeout(function(){
                self.push(frame);
                self._sync();
		    }, SECONDS_PER_FRAME);
	    } catch(e) {
		    // Out of Bounds Error: it was the last frame in file, so finished
		    this.push(null);
	    }
    });

    fs.readFile(mp3Path, function(error, data){
        if (error) {
            self.emit('error', error);
            self.push(null);
            return;
        }
        self._source = data;
        //this.push(''); // this will fire 'readable' event to enable clients to read
        self._sync();
    }); 
};

// Heritage as Node doc examples suggest
Mp3Stream.prototype = Object.create(
  stream.Readable.prototype, { constructor: { value: Mp3Stream }});

/*
	stream.Readable must implement stream._read()
*/
Mp3Stream.prototype._read = function(size){
    // this._sync();
}

Mp3Stream.prototype._sync = function(){
    if(this.offset > this._source.length){
        this.push(null);
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
		// so trying with next one
    
    	// Maybe last frame is not synced and when trying to read it, it 
    	// generates an OoBE but the whole song has been read correctly. 
    	// Checking it here.
		if (this.offset + 2 < this._source.length) {
			console.log("Cannot sync whole file, next one, please.\n", e)
			//this.nextFile();
			this.push(null);
			return; // Out from outer loop
		}
	}	
    this.emit('synced', frameHeader);
}

module.exports = exports.Mp3Stream = Mp3Stream;

var ms = new Mp3Stream('./test.mp3');
ms.on('open', function(){
    console.log('al ataque');
});
ms.on('readable', function(){
    console.log(this.read());
});
