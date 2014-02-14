'use strict';

/* Services */

var services = angular.module('services', []);

/* Album service */
services.factory('Album', ['$http', function($http) {
	
	// The service object I will be returning
	var AlbumService = {};
	
	/**
	 * Turns on debug statements within AlbumService
	 */
	AlbumService.debug = true;
	
	/**
	 * Cache of albums retrieved from server.
	 */
	AlbumService.albumCache = {};
		
	/**
	 * Retrieve album, possibly from client-side cache.
	 */
	AlbumService.getAlbum = function(albumPath) {
		var that = this;
		if (that.debug) console.log('getAlbum(' + albumPath + ')');
			
		// build a jQuery Deferred object
		var deferred = $.Deferred();
		
		// look for album in my cache of albums
		var album = that.albumCache[albumPath];
		
		// if album is in cache...
		if (album) {
			if (that.debug) console.log('getAlbum(): album [' + albumPath + '] is in cache');

			// resolve the deferred immediately with success
			deferred.resolve(album);
		}
		// else the album is not in cache... fetch it
		else {
			if (that.debug) console.log('getAlbum(): album [' + albumPath + '] NOT in cache, fetching from server');
			
			var albumUrl = this.getAlbumUrl(albumPath);
			$http({method: 'GET', url: albumUrl}).success(function(album) {
					if (that.debug) console.log('retrieved album [' + albumPath + '] from URL: ' + albumUrl);
					
					// add stuff that will be needed by the rendering system
					that._processAlbumFromServer(albumPath, album)
					
					// put album in client-side cache
					that.albumCache[albumPath] = album;
					
					// tell the deferred object to call all done() listeners
					deferred.resolve(album);
				}).error(function(e){
					if (that.debug) console.log("error fetching album: ", albumPath, data, status, headers, config);
					// tell the deferred object to call all .fail() listeners
					deferred.reject(xhr, options);
				});
			}
			
			// return the jQuery Promise so that the callers can use .then(), .always(), .done() and .fail()
			return deferred.promise();
		};
		
		/**
		 * Return the URL location of the album's JSON
		 */
		AlbumService.getAlbumUrl = function(albumPath) {
				// Album IDs are of this format:
				//   2013
				//   2013/09-08
				//   2013/09-08/someSubAlbum
				var year = albumPath.split('/')[0];

				// if the year is 2007 or greater, the album's in Gallery2
				if (year >= 2007) {
					return 'http://tacocat.com/pictures/main.php?g2_view=json.Album&album=' + albumPath;
				}
				// 2006 and earlier years are in static JSON
				// at /oldpix/year/month-day/album.json
				// such as /oldpix/2001/12-31/album.json
				else {
					return 'http://tacocat.com/oldpix/' + albumPath + '/album.json';
				}
		};
		
		/**
		 * Takes an album from the server and adds all the stuff
		 * that will be needed by the rendering side of things.
		 */
		AlbumService._processAlbumFromServer = function(albumPath, album) {
			if (this.debug) console.log('processAlbum():', albumPath, album);
					
			//
			// If album doesn't have an ID, it's 2006 or older,
			// and those come from static JSON.  They have a
			// different format and we'll be processing them
			// differently in places.
			//
			var isStaticAlbum = (!album.id);
			
			//	
			// Figure out what type of album it is:  root, year or week
			//
			
			// no path: it's the root album
			if (!albumPath || albumPath.length <= 0) {
				album.albumType = 'root';
			}
			// no slashes:  it's a year album
			else if (albumPath.indexOf('/') < 0) {
				album.albumType = 'year';
			}
			// else it's a subalbum (2005/12-31 or 2005/12-31/snuggery)
			else {
				album.albumType = 'week';
			}
			
			//
			// Set up link to album's parent, needed for the Back button
			//
			
			if (album.albumType === 'root') {
				album.parentAlbumPath = null;
				
			}
			else if (album.albumType === 'week') {
				var pathParts = albumPath.split('/');
				pathParts.pop();
				album.parentAlbumPath = pathParts.join('/');
			}
			else if (album.albumType === 'year') {
				album.parentAlbumPath = '';
			}
			
			//
			// Set up javascript Date object of this album's creation time
			//
			album.creationDate = new Date(album.creationTimestamp * 1000);
			
			
			//
			// Set up album's title
			//
			
			// blank out any title on the root album, we don't want to display it
			if (album.albumType === 'root') {
				album.title = undefined;
			}
			// Add a 'fulltitle' attribute accessbile to templating
			if (album.albumType === 'week') {
				album.fulltitle = album.title + ', ' + album.creationDate.getFullYear();
			}
			else if (album.albumType === 'year') {
				album.fulltitle = album.title + ' - Dean, Lucie, Felix & Milo Moses';
			}

			// If the album's caption has any links to the the old
			// picture gallery, rewrite them to point to this UI
			if (album.description) {
				// TODO: copy over from Backbone
				//album.description = app.rewriteGalleryUrls(album.description);
			}
			
			// If album doesn't have URL, it's a pre 2007 album.
			// Give it URL of same structure as post 2006 albums.
			if (!album.url) {
				// like v/2013 or v/2013/12-31/
				album.url = 'v/' + album.pathComponent;
			}
									
			//
			// If album is a year album...
			//
			if (album.albumType === 'year') {
			
				// If the album is a pre 2007 year, do some munging on its thumbnails
				if (isStaticAlbum) {
				
					// Each child is thumbnail of a week album
					_.each(album.children, function(entry, key) {
														
						// Generate url to album.
						// Give url same structure as post 2006 albums
						if (!entry.url) {
							// like v/2013/12-31/
							entry.url = 'v/' + entry.pathComponent;
						}
	
						// Generate thumbnail image info.
						// Thumb will use full-sized image sent through an 
						// image proxy service (this is temporary, need a more
						// performant solution like hooking up to a CDN)
						if (!entry.thumbnail) {
							var url = null;
	
							if (entry.fullSizeImage.url) {
								url = 'http://images.weserv.nl/?w=100&h=100&t=square&url=';
								url = url + entry.fullSizeImage.url.replace('http://', '');
							}
							else {
								console.log("warning: no thumb image found for album " + albumPath);
							}
							entry.thumbnail = {
								url: url,
								height: 100,
								width: 100
							};
						}
					});
				}
				
				// Group the child week albums of the year album by month
				var childAlbumsByMonth = _.groupBy(album.children, function(child) {
					// create Date object based on album's timestamp
					// multiply by 1000 to turn seconds into milliseconds
					return new Date(child.creationTimestamp * 1000).getMonth();
				});

				// Put in reverse chronological array
				var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
				album.childAlbumsByMonth = [];
				for (var i = 11; i >= 0; i--) {
					if (childAlbumsByMonth[i]) {
						var month = {
							monthName: monthNames[i],
							albums: childAlbumsByMonth[i]
						};
						album.childAlbumsByMonth.push(month);
					}
				}
								
				if (this.debug) console.log("childAlbumsByMonth", album.childAlbumsByMonth);
			}
						
			//
			// Do some munging on the album's photos
			//
			if (album.albumType === 'week') {
				
				// Pre 2007 albums store photos in an associative array instead 
				// of a regular array.  Photo order is in the .childrenOrder array.
				// Move .children to .photosByPhotoName and make a correctly ordered
				// array at .children.
				if (album.childrenOrder) {
					album.photosByPhotoName = album.children;
					album.children = [];
					_.each(album.childrenOrder, function(childName) {
						var photo = album.photosByPhotoName[childName];
						album.children.push(photo);
					});
				}
			
				//
				// process each album photo
				//
				_.each(album.children, function(entry, key) {
															    
					// If the caption contains any <a hrefs> that link to a gallery
					// URL, rewrite them to point to this UI instead.
					// TODO: copy over from Backbone
					//entry.description = app.rewriteGalleryUrls(entry.description);
					
					// If I don't have URL to full sized image, I'm a post 2006 album.
					// Generate now
					if (!entry.fullSizeImage) {
						entry.fullSizeImage = {
							// http://tacocat.com/pictures/d/{{id}}-3/{{pathComponent}}
							url: 'http://tacocat.com/pictures/d/' + entry.id + '-3/' + entry.pathComponent
						};
					}
					
					// If I don't have a URL to my photo page, I'm a pre 2007 album.
					// Set up URL here of same format as post 2006 albums: v/2009/11-08/supper.jpg.html
					if (!entry.url) {
						entry.url = 'v/' + album.pathComponent + '/' + entry.pathComponent + '.html';
					}
				
					// If I don't have a thumbnail URL, I'm a pre 2007 album.
					// Generate a thumb using my full-sized image using an 
					// image proxy service (this is temporary, need a more
					// performant solution like hooking up to a CDN)
					if (!entry.thumbnail) {
						var url = 'http://images.weserv.nl/?w=100&h=100&t=square&url=';
						url = url + entry.fullSizeImage.url.replace('http://', '');
						entry.thumbnail = {
							url: url,
							height: 100,
							width: 100
						};
					}
				});
			}
			
			//
			// Attach some helper functions to the album
			//
			
			/**
			 * Find a photo by it's pathComponent, like 'flowers.jpg'
			 */
			album.getPhotoByPathComponent = function(pathComponent) {
				//console.log('Album.Model.getPhotoByPathComponent('+pathComponent+'): model: ', jQuery.extend(true, {}, this));
				var photo = _.find(this.children, function(child) {
					//console.log('album.getPhotoByPathComponent('+pathComponent+'): looking at child.pathComponent: ' + child.pathComponent);
					return child.pathComponent === pathComponent;
				});
		
				return photo;
			};
		
			album.getNextPhoto = function(pathComponent) {
				//console.log('Album.Model.getNextPhoto('+pathComponent+')');
				var foundCurrentPhoto = false;
				return _.find(this.children, function(child) {
					//console.log('album.getNextPhoto('+pathComponent+'): looking at child.pathComponent: ' + child.pathComponent);
					if (foundCurrentPhoto) {
						//console.log('album.getNextPhoto('+pathComponent+'): ' + child.pathComponent + ' is the next photo!');
						return true;
					} else if (child.pathComponent === pathComponent) {
						foundCurrentPhoto = true;
					}
				});
			};
		
			album.getPrevPhoto = function(pathComponent) {
				var prevPhoto;
				_.find(this.children, function(child) {
					if (child.pathComponent === pathComponent) {
						return true;
					}
					prevPhoto = child;
				});
		
				return prevPhoto;
			};
		};
		
		return AlbumService;
  }]);