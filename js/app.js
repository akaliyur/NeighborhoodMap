const Zomato_API_KEY = '827f3be5afb0d238c1497287070099c0';

// Coordinates for Houston
const lat = '29.761993';
const long = '-95.366302';

// Map variables
var map;
var infowindow;
var bounds;

// google maps callback function
function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 29.761993, lng: -95.366302},
		zoom: 13,
		mapTypeControl: false
	});
	infowindow = new google.maps.InfoWindow();
	bounds = new google.maps.LatLngBounds();

	// Apply bindings here
	ko.applyBindings(new ViewModel());
}

// function to display error message when the map doesn't load
function mapLoadError() {
	alert("Google Maps couldn't be loaded. Please try again!");
}

// function to fetch data from the url endpoint
function getData(url) {
	return new Promise(function(resolve, reject){
		$.ajax({
			url: url,
			type: 'GET',
			dataType: 'json',
			success(response){
				//console.log("Within ajax call:");
				//console.log(response);
				resolve(response);
			},
			error(jqXHR, status, errorThrown){
				console.log("error status:");
				reject(status);
			}
		});
	});
}

// Restaurant Class
var Restaurant = function(name, rating, address, cuisines, avgCost, lat, long) {
	this.name = name;
	this.rating = rating;
	this.address = address;
	this.cuisines = cuisines;
	this.avgCost = avgCost;
	this.lat = lat;
	this.long = long;
	this.show = true;
};

// Knockout's ViewModel
var ViewModel = function() {
	var self = this;
	
	var url = 'https://developers.zomato.com/api/v2.1/search?lat='+lat+'&lon='+long+'&sort=rating&order=asc&apikey='+Zomato_API_KEY;
	
	self.restaurantData = ko.observableArray([]);
	self.markers = ko.observableArray([]);

	//set the current map item
	self.currentMapItem = self.markers()[0];
	
	self.data = getData(url);
	
	// fetch data from zomato using JS promises
	self.data.then(function(response){
		self.handleResponse(response);
	}).catch(function(error){
		alert("Oops! It looks like the data couldn't be fetched from the Zomato_API... Please try refreshing the webpage!");
	});

	// handle json response here
	self.handleResponse = function(response){
		
		// Iterate over each json object and populate restaurantData array and create markers for the same
		$.each(response.restaurants, function(index, element){
			var restaurant = element.restaurant;
			// console.log(restaurant);
			self.restaurantData.push(
				new Restaurant(
					restaurant.name,
					restaurant.user_rating.aggregate_rating,
					restaurant.location.address,
					restaurant.cuisines,
					restaurant.average_cost_for_two,
					restaurant.location.latitude,
					restaurant.location.longitude
				)
			);
			// Marker code
			var position = {lat: parseFloat(restaurant.location.latitude), lng: parseFloat(restaurant.location.longitude)};
			var title = restaurant.name;
			var cuisines =restaurant.cuisines;
			var avgCost = restaurant.average_cost_for_two;
			var address = restaurant.location.address;
			var rating = restaurant.user_rating.aggregate_rating;
			//create a marker per location, and put into markers array
			var marker = new google.maps.Marker({
				map: map,
				position: position,
				title: title,
				animation: google.maps.Animation.DROP,
				cuisines: cuisines,
				avgCost: avgCost,
				address: address,
				rating: rating,
				show: ko.observable(restaurant.show)
			});
			// push the marker to the markers array
			self.markers.push(marker);
			// create an onclick event handler to log the message on the console.
			marker.addListener('click', function(){
				//self.displayMessage();
				self.populateInfoWindow(marker);
			});
			bounds.extend(marker.position);
			// end - marker code

		});
		// Extend the boundaries of the map for each marker
		map.fitBounds(bounds);
		// Display the restaurant List
		self.setMapOnAll(map);
		// console.log(self.restaurantData());
	};

	// filter input textbox binding
	self.filterInput = ko.observable('');

	// apply filter on every keydown event
	self.applyFilter = function() {

		var currentFilter = self.filterInput();
		infowindow.close();

		//filter the list as user seach
		if (currentFilter.length === 0) {
				self.setMapOnAll(map);
			} else {
				for (var i = 0; i < self.markers().length; i++) {
					// console.log(self.markers().length);
					if (self.markers()[i].title.toLowerCase().indexOf(currentFilter.toLowerCase()) > -1) {
						self.markers()[i].show(true);
						self.markers()[i].setVisible(true);
					} else {
						self.markers()[i].show(false);
						self.markers()[i].setVisible(false);
					}
				}
		}
		infowindow.close();
	};

	self.setMapOnAll = function(map) {
		for (var i = 0; i < self.markers().length; i++) {
		  self.markers()[i].setVisible(true);
		  self.markers()[i].show(true);
		}
	};

	self.animateMarker = function(marker){
		marker.setAnimation(google.maps.Animation.BOUNCE);
		setTimeout(function(){ marker.setAnimation(null);}, 2000);
	};

	//display info window
	self.populateInfoWindow = function(marker) {
		// Check to make sure the infowindow is not already opened on this marker.
		self.currentMapItem = marker;
		if (infowindow.marker != marker) {
			infowindow.marker = marker;
			var infoWindowContent;
			if(self.currentMapItem.avgCost === "0" || self.currentMapItem.avgCost === ""){
				infoWindowContent = "<h3>"+self.currentMapItem.title+"</h3><h6>Rating: "+self.currentMapItem.rating+"</h6><h6>Cuisines: "+self.currentMapItem.cuisines+"</h6><h6>Average-cost for two: $ Information Unavailable!</h6><h6>Credits: Zomato</h6>";
			}
			else{
				infoWindowContent = "<h3>"+self.currentMapItem.title+"</h3><h6>Rating: "+self.currentMapItem.rating+"</h6><h6>Cuisines: "+self.currentMapItem.cuisines+"</h6><h6>Average-cost for two: $"+self.currentMapItem.avgCost+"</h6><h6>Credits: Zomato</h6>";
			}
			// infowindow.setContent('<div>' + self.currentMapItem.title + '</div>');
			infowindow.setContent(infoWindowContent);
			infowindow.open(map, marker);
			// Make sure the marker property is cleared if the infowindow is closed.
			infowindow.addListener('closeclick',function(){
				infowindow.setMarker = null;
			});
			self.animateMarker(marker);
		}
	};
};
