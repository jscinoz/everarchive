## Current priorities ##
* Write torrent server
* Complete code to retrieve page .torrent from dht
* Write frontend
* Add progress events throughout
* Implement GridFSStorage for webtorrent
* Implement writeAssetsToGridFS transform for assetgraph

## Configuration ##
* Web port
* DHT port
* Torrent port
* Proxy settings

## Rework ##
* Figure out a cleaner way for assorted modules to access lookupService and torrentService without passing it around everywhere

## Misc tasks ##
* Proxy support?
* Some external resources not being archived (e.g: typekit js when testing against http://nodejs.org)
* Need to give some consideration to upgrade path - we don't want to leave
  orphaned torrents
* Hook outgoing links, notify user they're leaving archive
* Package as node-webkit app :3
* Mobile (cordova?) app? :O
* Fix errors in assetgraph transforms being swallowed.
* Render pages in web component for style encapsulation, or render huge and have a hidable, pos-absolute overlay
* Provide ability to download zip, magnet, torrent file, also cache these
* Provide image mode as well as html mode
* Allow client to seed too! :D
* Handle archiving multiple revisions of page - WILL BREAK DATA COMPAT
* Audit gridfs-stream memory usage (Is gridfs-stream issue #58 fixed?)
* robots.txt
* Document that model methods return promises
* move let declarations to closer to first use
* Investigate if we should use trackers or not
* Change most model methods & statics to return promises, rather than directly being generators
* Remove most asserts (or only run in dev mode), and write tests
* Follow on from above, null & type checking, error handling
* Spdy push of assets
* load config from nconf
* Support precompiled client resources AND on-the-fly compile
* Support CORS
* Validate input url is text/html - we don't want people directly archiving huge binary files... Or do we?
* if in production mode (NODE_ENV), disable mongoose autoIndex
* Consider queing crawler tasks?
* redis caching (LRU?) of data from gridfs - would this even be necessary? probably not
