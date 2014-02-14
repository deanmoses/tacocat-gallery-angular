'use strict';

angular.module('tacocatGalleryAngularApp', [
	'ngCookies',
	'ngResource',
	'ngSanitize',
	'ngRoute',
	'services'
])
.config(function ($routeProvider) {
	$routeProvider
	.when('/v/:path*.html', {
		templateUrl: 'views/main.html',
		controller: 'PhotoCtrl'
	})
	.when('/v/:path*?', {
		templateUrl: 'views/main.html',
		controller: 'AlbumCtrl'
	})
	.when('', {
		redirectTo: '/v/'
	})
	.when('/', {
		redirectTo: '/v/'
	})
	.when('/v', {
		redirectTo: '/v/'
	})
	.otherwise({
		templateUrl: '404.html'
	});
});