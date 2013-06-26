var Mp3Stream = require('../Mp3Stream.js');

describe("Test suite for MP3Stream class", function(){

    var synceds, readables = 0;

    beforeEach(function(){
        synceds = 0; readables = 0;
    });

    it("must stream a file with 10 frames exactly", function(done){
        var ms = new Mp3Stream('./spec/test10.mp3');
        ms.on('synced', function(){ 
            ++synceds; 
        });
        ms.on('readable', function(){
            ++readables;
            this.read();
        });
        ms.on('end', function(){
            expect(synceds).toEqual(10);
            expect(readables).toEqual(11);
            done();
        });
    });


    it("must stream a file with 5 frames and some garbage at the end of the file", function(done){
        var ms = new Mp3Stream('./spec/test5garbage.mp3');
        ms.on('synced', function(){ 
            ++synceds;
        });
        ms.on('readable', function(){
            ++readables;
            this.read();
        });
        ms.on('end', function(){
            expect(synceds).toEqual(5);
            expect(readables).toEqual(6);
            done();
        });
    });

});
