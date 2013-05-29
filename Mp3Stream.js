var path = require('path'), 
    fs = require('fs'),
    stream = require('stream');

/*
	Generates a readable stream of mp3 frames from mp3 files contained in
	'basedir'
*/
var Mp3Stream = function(mp3File, options){
	if (!(this instanceof Mp3Stream))
		return new Mp3Stream(options);
	stream.Readable.call(this, options);
	
/*	var self = this;
	this._basedir = path.normalize(basedir);
	this._queue = [];
	fs.readdir(this._basedir, function(err, files){
        // Discard non mp3 files
        for(var i=0,l=files.length; i<l; i++){
//            if pa
        }
	});*/

	this._source;
    this.offset = 0;
	
	// current mp3 file as Buffer
    fs.readFile(mp3File, function(error, data){
        if (error) this.push(null); //perfilar bien este error
        this._source = data;
        this.push(''); // this will fire 'readable' event to enable clients to read
    }); 
};

// Heritage as Node doc examples suggest
Mp3Stream.prototype = Object.create(
  stream.Readable.prototype, { constructor: { value: Mp3Stream }});

/*this.prototype.nextFile = function(){
		var mp3Name = files.shift();
		if (mp3Name != null) {
			fs.readfile(path.join(self._basedir, mp3Name), function(err, file){
				self._source = file;
                self.push('');
				// MAL! self.emit('readable');
			});
		}
};*/

/*
	stream.Readable must implement stream._read()
*/
Mp3Stream.prototype._read = function(size){

    if(this.offset > this._source.length){
        //this.nextFile();
        this.push(null);
    }

    var frameHeader;
	var synced = false;
	try{
		while (~synced) {
			frameHeader = song.readUInt32BE(this.offset++);
			synced = (frameHeader & SYNC_MASK) >> 20;
			var mp3 = (frameHeader & MP3_SIGNATURE) >> 17;
			if (mp3 != 5) synced = false;
		}
	} catch(e){
		// Out of Bounds Error: sync not found in whole file
		// so trying with next one
    
    	// Maybe last frame is not synced and when trying to
        // read it, it generates an OoBE but the whole song 
        // has been read correctly. Checking it here.
		if (offset + 2 < song.length) {
			console.log("Cannot sync whole file, next one, please.\n", e)
			//this.nextFile();
			this.push(null);
			return; // Out from outer loop
		}
	}

	var hasPadding = (frameHeader & 0x0000200) >> 9;
	// Explain 417 here
	var frameLength = 417 + (hasPadding? 1 : 0);
	var frame;
	try{
		frame = song.slice(offset - 1, offset - 1 + frameLength);
		offset += frameLength - 1;
		this.push(frame);
	} catch(e) {
		// Out of Bounds Error: it was the 
        // last frame in file, so finished
		break;
	}

}

Mp3Stream.prototype._sync = function(){
    this.emit('sync');
}

module.exports = exports.Mp3Stream = Mp3Stream;
