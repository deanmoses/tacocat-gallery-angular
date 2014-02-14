'use strict';

angular.module('tacocatGalleryAngularApp')

//
// Album controller
//
.controller('AlbumCtrl', function ($scope, $routeParams, Album) {
	$scope.waiting=true;
	
	console.log("AlbumCtrl route params:", $routeParams);
	
	/**
	 * Helper method to normalize album path
	 */
	function normalizePath(path) {
		if (!path) {
			return '';
		}
		
		// strip any trailing slash
		path = path.replace(/\/$/, '');
		
		// Regularize path by getting rid of any preceding or trailing slashes
		var pathParts = path.split('/');
		return pathParts.join('/');
	}
	
	// Set up album path
	var albumPath = normalizePath($routeParams.path);

	// Retrieve album either from client-side cache or server
	Album.getAlbum(albumPath).done(function(album) {
		console.log('album', album);
		$scope.album = album;
		$scope.pageType = "album-" + album.albumType;
		$scope.albumOrPhoto = "album";
	}).fail(function(data, status, headers, config){
		console.log("error loading url: ", data, status, headers, config);
	}).always(function() {
		$scope.waiting=false;
	});
})

//
// Photo controller
//
.controller('PhotoCtrl', function($scope, $routeParams, Album) {
	$scope.waiting=true;
	console.log("PhotoCtrl.  Route params: ", $routeParams);

	var pathParts = $routeParams.path.split('/');
	var photoId = pathParts.pop();
	var albumPath = pathParts.join('/');
	
	console.log('PhotoCtrl photo ' + photoId + ' in album ' + albumPath);
	
	// Retrieve photo's album either from client-side cache or server
  	Album.getAlbum(albumPath).done(function(album) {
		var photo = album.getPhotoByPathComponent(photoId);
		if (!photo) {
			throw 'No photo with ID ' + photoId;
		}
		console.log('photo', photo);
		photo.orientation = (photo.height > photo.width) ? 'portrait' : 'landscape';
		
		$scope.photo = photo;
		$scope.album = album;
		$scope.nextPhoto = album.getNextPhoto(photoId);
		$scope.prevPhoto = album.getPrevPhoto(photoId);
		$scope.pageType = "photo";
		$scope.albumOrPhoto = "photo";
		
	}).fail(function(data, status, headers, config){
		console.log("error loading url: ", data, status, headers, config);
	}).always(function() {
		$scope.waiting=false;
	});
});
