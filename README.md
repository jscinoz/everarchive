# everarchive
A distributed, uncensorable web page archiver built on webtorrent, assetgraph &amp; mongodb's gridfs

# NOT FINISHED / USABLE YET #

## Current status/progress ##
### Working (but probably needing cleanup) ###
* Crawling a page and saving assets to [GridFS](http://docs.mongodb.org/manual/core/gridfs/)
* Creation of torrents containing all assets of archived page, via [create-torrent](https://github.com/feross/create-torrent)
* Retrieval & serving of archived page from [GridFS](http://docs.mongodb.org/manual/core/gridfs/)

### In-progress ###
* Lookup of .torrent file for a given page via [bitorrent-dht](https://github.com/feross/bittorrent-dht)
* Seeding of created page torrents
    * This involves writing a new storage module for webtorrent, that does streamed I/O against [Mongo's](https://github.com/mongodb/mongo) [GridFS](http://docs.mongodb.org/manual/core/gridfs/) via [gridfs-stream](https://github.com/aheckmann/gridfs-stream)

### To do ###
* Retrieval of page content from torrent
* Cleanup of [crawler method](https://github.com/jscinoz/everarchive/blob/master/server/util/archiver.js#L25)
    * Will probably rework [GridFS](http://docs.mongodb.org/manual/core/gridfs/)-related functionality into a writeAssetsToGridFs transform for [assetgraph](https://github.com/assetgraph/assetgraph)
* Shiny [frontend](https://github.com/jscinoz/everarchive/tree/master/client) (it's a literally just an unstyled text input & a submit button currently)
* Everything in [TODO.md](https://github.com/jscinoz/everarchive/blob/master/TODO.md)
