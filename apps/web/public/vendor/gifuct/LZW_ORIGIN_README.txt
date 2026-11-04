Implementation of GifDecoder that is more memory efficient to animate for Android devices.
This implementation does not house in memory a Bitmap for every image frame. Images are instead decoded
on-the-fly, and only the minimum data to create the next frame in the sequence is kept.  The
implementation has also been adapted to reduce memory allocations in the decoding process to reduce
time to render each frame.

Adapted from: http://show.docjava.com/book/cgij/exportToHTML/ip/gif/stills/GifDecoder.java.html