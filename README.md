Mp3Stream for Node 0.10
---

This class streams an mp3 file from disk, splitting it into its frames,
according to new Node 0.10 Stream implementation.

Useful, maybe, to encapsulate those frames into packets in streaming apps.

- It emits 'readable' event when a frame is available in the buffer.
  It ignores size argument in read().

- It emits 'sync' event when it finds a frame synchronization header.
  'syncout' event will be supported.

- It only accepts 128Kbps/44.1kHz encoded audio. Support for all 
  types of mp3 will be added.
