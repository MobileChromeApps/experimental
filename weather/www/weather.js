/**
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 **/

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// consts

const num_dots_at_bottom = 4;
const base_weather_url = 'http://free.worldweatheronline.com/feed/weather.ashx?format=json&num_of_days=5&key=78b33b52eb213218120708&q=';
const base_geolocation_url = 'http://maps.googleapis.com/maps/api/geocode/json?sensor=true&language=EN&latlng=';
const base_searchterm_url = 'http://maps.googleapis.com/maps/api/geocode/json?sensor=false&language=EN&address=';
// Samples:
// http://maps.googleapis.com/maps/api/geocode/json?sensor=false&address=kingston
// http://maps.googleapis.com/maps/api/geocode/json?sensor=true&latlng=43.480926,-80.53766399999999

const days = {
    0 : 'Sunday',
    1 : 'Monday',
    2 : 'Tuesday',
    3 : 'Wednesday',
    4 : 'Thursday',
    5 : 'Friday',
    6 : 'Saturday'
};

const condition_codes = {
    113 : 'sunny',
    116 : 'partly-cloudy',
    119 : 'cloudy',
    122 : 'cloudy',
    143 : 'mostly-sunny',
    176 : 'scattered-light-rain',
    179 : 'light-snow',
    182 : 'rain-snow',
    185 : 'rain-snow',
    200 : 'tstorm',
    227 : 'snow',
    230 : 'snow',
    248 : 'cloudy',
    260 : 'cloudy',
    263 : 'scattered-light-rain',
    266 : 'light-rain',
    281 : 'rain-snow',
    284 : 'rain-snow',
    293 : 'scattered-light-rain',
    296 : 'light-rain',
    299 : 'light-rain',
    302 : 'rain',
    305 : 'rain',
    308 : 'rain',
    311 : 'rain',
    314 : 'hail',
    317 : 'rain-snow',
    320 : 'rain-snow',
    323 : 'light-snow',
    326 : 'light-snow',
    329 : 'scattered-snow',
    332 : 'snow',
    335 : 'scattered-snow',
    338 : 'snow',
    350 : 'hail',
    353 : 'light-rain',
    356 : 'rain',
    359 : 'rain',
    362 : 'rain-snow',
    365 : 'rain-snow',
    368 : 'light-snow',
    371 : 'snow',
    374 : 'hail',
    377 : 'hail',
    386 : 'scattered-light-rain',
    389 : 'rain',
    392 : 'light-snow',
    395 : 'snow',
};

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// "model"

function City(address) {
    this.id = City.ConvertAddressDomFriendly(address);
    this.address = address;
    this.date = new Date();
}

City.ConvertAddressDomFriendly = function(address) {
    return address.toLowerCase().replace(/,/g , "-").split(' ').join('-');
}

function Cities() {
    this.cities = [];
    this.version = Cities.CurrentVersion;
}

Cities.CurrentVersion = 2;

Cities.prototype.sync = function() {
    this.cities.forEach(function(city) {
        city.date = city.date.toJSON();
    });
    chrome.storage.sync.set({ 'cities': this });
    this.cities.forEach(function(city) {
        city.date = new Date(city.date);
    });
}

Cities.prototype.add = function(city) {
    this.cities.push(city);
    this.sync();
}

Cities.prototype.remove = function(city) {
    this.cities.splice(this.cities.indexOf(city), 1);
    this.sync();
}

Cities.prototype.length = function() {
    return this.cities.length;
}

Cities.prototype.findByKey = function(key, value) {
    for (var i = 0; i < this.cities.length; ++i) {
        var city = this.cities[i];
        if (city[key] === value)
            return city;
    }
    return null;
}

Cities.prototype.findById = function(value) {
    return this.findByKey("id", value);
}

Cities.prototype.sortedByKey = function(key) {
    return this.cities.slice(0).sort(function(a,b){
        var ret = (typeof a[key] === 'string') ? a[key].localeCompare(b[key]) : a[key] - b[key];
        return ret;
    });
}

Cities.prototype.ordered = function() {
    return this.sortedByKey('date');
}

Cities.prototype.asArray = function(key) {
    return this.cities;
}

function WeatherData(city, current_condition, forecast) {
    this.city = city;
    this.current_condition = current_condition;
    this.forecast = forecast;
}

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// globals

var temp = 'F';
var cities = null;
var current_city = null;
var weather_data = {}; // map city.id->WeatherData

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// "controller"

function selectCity(city) {
    // TODO save city selection on app exit

    if (!city)
        return;

    current_city = city.id;
    // TODO Perhaps don't sync the current city..
    // First, because it spams sync server, but more importantly, because we should default to current location on app start
    chrome.storage.sync.set({current_city: current_city});
    
    $('.forecast').removeClass('selected');
    $('.dot').removeClass('selected');
    $('.' + city.id).addClass('selected');

    setDots();
}

function deleteCity(city) {
    if (!city)
        return;
    $('.' + city.id).remove();
    delete weather_data[city.id];
    cities.remove(city);
    selectCity(getCurrentCity());
}

function addCity(address) {
    var id = City.ConvertAddressDomFriendly(address);
    var city = cities.findById(id);
    if (city != null)
        return city;
    city = new City(address);
    cities.add(city);
    selectCity(city);
    return city;
}

function getCurrentCity() {
    var city = cities.findById(current_city);
    if (!city && cities.length() > 0)
        city = cities.asArray()[0];
    return city;
}

function addWeatherData(city, current_condition, forecast) {
    weather_data[city.id] = new WeatherData(city, current_condition, forecast);
    refresh();
}

function currentlyOnSettingsPage() {
    return $('#weather').hasClass('hidden');
}

function hideSettings() {
    $('#weather').removeClass('hidden');
    $('#settings').addClass('hidden');
    $('#dots').removeClass('hidden');
    $('#new-city').val('');
    hideInputError();
}

function showSettings() {
    $('#weather').addClass('hidden');
    $('#settings').removeClass('hidden');
    $('#dots').addClass('hidden');
    $('#new-city').focus();
    hideInputError();
}

function showInputError(searchterm) {
    $('input#new-city').addClass('form-error');
    $('.new .error-message').text('Could not find weather for \'' + searchterm + '\'');
    $('.new .error-message').removeClass('hidden');
}

function hideInputError() {
    $('input#new-city').removeClass('form-error');
    $('input#new-city').val('');
    $('.new .error-message').addClass('hidden');
    $('.new').removeClass('selected');
}

function adjustnext(n) {
    var c = cities.ordered();
    var index = c.indexOf(getCurrentCity());
    var newCity = c[Math.min(c.length-1, index+n)];
    selectCity(newCity);
}

function adjustprev(n) {
    var c = cities.ordered();
    var index = c.indexOf(getCurrentCity());
    var newCity = c[Math.max(0, index-n)];
    selectCity(newCity);
}

function attemptAddCity(searchurl, onsuccess, onerror) {
    // TODO: figure out how to resolve conflicts when multiple cities returned
    // Idea: seems to be duplication at the google api level, so maybe create a set of unique canonical id's, and then ask user to resolve?
    $.get(searchurl, function(data) {
        //var address_components = null;
        var formatted_address = null;
        for (var i = 0; i < data.results.length; i++) {
            if (data.results[i].types.indexOf('locality') != -1) {
                //address_components = data.results[i].address_components;
                formatted_address = data.results[i].formatted_address;
                break;
            }
        }

        if (!formatted_address) {
            if (onerror !== undefined && onerror !== null)
                onerror();
        }

        /*
        for (var j = 0; j < address_components.length; j++) {
            if (address_components[j].types.indexOf('locality') != -1) {
                city_long = address_components[j].long_name;
                city_short = address_components[j].short_name;
            }
            if (address_components[j].types.indexOf('country') != -1) {
                country_long = address_components[j].long_name;
                country_short = address_components[j].short_name;
            }
        }*/

        getWeatherData(formatted_address, function(current_condition, forecast) {
            var city = addCity(formatted_address);
            addWeatherData(city, current_condition, forecast);
            if (onsuccess !== undefined && onsuccess !== null)
                onsuccess();
        }, onerror);
    }, 'json');
}

function getWeatherData(address, onsuccess, onerror) {
    var url = encodeURI(base_weather_url + address);
    $.get(url, function(data) {
        if (!data.data.error) {
            var current_condition = data.data.current_condition[0];
            var forecast = data.data.weather;
            if (onsuccess !== undefined && onsuccess !== null)
                onsuccess(current_condition, forecast);
        } else {
            if (onerror !== undefined && onerror !== null)
                onerror();
        }
    }, 'json');
};

function updateAllWeatherData() {
    cities.asArray().forEach(function(city) {
        getWeatherData(city.address,
            function(current_condition, forecast) {
                addWeatherData(city, current_condition, forecast);
            }, null); // TODO: handle error?
    });
}

function attemptAddCurrentLocation() {
    // TODO: we always permanentally add your current location.  Should keep a history of all places, but only display "pinned" places
    // and the current location
    navigator.geolocation.getCurrentPosition(
        function(position) {
            var searchurl = base_geolocation_url + position.coords.latitude + ',' + position.coords.longitude;
            attemptAddCity(searchurl, null, function() {
                console.log("Could not add city using geolocation");
                if (cities.length() === 0)
                    showSettings();
            });
        },
        function(error) {
            console.log("Geocoder failed");
            showSettings();
        }); 
}

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// "view"

function refresh() {
    cities.sortedByKey('date').forEach(function(city) {
        if (weather_data.hasOwnProperty(city.id)) {
            var w = weather_data[city.id];
            addLocationDisplay(city, w.current_condition, w.forecast);
        }
    });
}

function setDots() {
    if (cities.length() <= num_dots_at_bottom) {
        $('.dot').addClass('shown');
        $('#dots #prev').removeClass('disabled').removeClass('shown');
        $('#dots #next').removeClass('disabled').removeClass('shown');
    } else {
        $('.dot').removeClass('shown');

        var c = cities.ordered();
        var index = c.indexOf(getCurrentCity());
        var i = index % num_dots_at_bottom;
        var first = index - i;
        for (var l = first; l < first + num_dots_at_bottom && l < c.length; l++)
            $('#dots .dot.' + c[l].id).addClass('shown');

        if (first === 0)
            $('#dots #prev').removeClass('shown').addClass('disabled');
        else
            $('#dots #prev').addClass('shown').removeClass('disabled');

        if ((first + num_dots_at_bottom) >= c.length)
            $('#dots #next').removeClass('shown').addClass('disabled');
        else
            $('#dots #next').addClass('shown').removeClass('disabled');

    }
}

function addLocationDisplay(city, current_condition, forecast) {
    // First, remove old city data
    $('.' + city.id).remove();

    var description = condition_codes[current_condition.weatherCode];
    var forecast_html = '<div class="forecast ' + city.id + ' ' + description + '"></div>';
    var dot_html = '<div class="dot ' + city.id + '" title="' + city.id + '"></div>';
    var city_html = '<div class="city">' + city.address + '</div>';
    var cities_list_html = '<div class="city-list ' + city.id + '"><div class="delete"></div>' + city.address + '</div>';
    var current_html = currentDisplay(current_condition);
    var tempMax = forecast[0]['tempMax' + temp];
    var tempMin = forecast[0]['tempMin' + temp];
    var high_low = '<div class="high_low">' + tempMax + '&deg; / ' + tempMin + '&deg;</div>';
    var day_html = '';
    // TODO: remplace this with forecast.map(dayDisplay).join or reduce or forEach
    for (var i = 0; i < forecast.length; i++) {
        day_html += dayDisplay(forecast, i);
    }

    // update the UI
    $('#settings .cities-list').append(cities_list_html);
    $('#weather').append(forecast_html);
    $('#weather .' + city.id).append(current_html);
    $('#weather .' + city.id).append(high_low);
    $('#weather .' + city.id).append(city_html);
    //$('#weather .' + city.id).append(day_html);
    $('#dots #next').before(dot_html); // TODO: instead of always append-to-end, should add in sorted order

    if (city === getCurrentCity())
        selectCity(city);

    setDots();

    // TODO
    // What follows is a workaround for broken jquery "live" onclick functionality on mobile.
    // Need to 'poke' elements so they are clickable.
    Array.prototype.forEach.call(document.querySelectorAll('#dots .dot'), function(e,i) {
        e.onclick = function(){};
    });
    Array.prototype.forEach.call(document.querySelectorAll('.city-list .delete'), function(e,i) {
        e.onclick = function(){};
    });
}

function currentDisplay(current_condition) {
    var current_temp = current_condition['temp_' + temp];
    var current_description = current_condition.weatherDes/[0].value;
    var current_icon = condition_codes[current_condition.weatherCode];
    var html = '<div class="current">' +
                                '<div class="current-temp">' + current_temp + '</div>' +
                                '<div class="current-icon ' + current_icon + '" title="' + current_description + '"></div>' +
                            '</div>';
    return html;
}

function dayDisplay(forecast, i) {
    var day_data = forecast[i];
    var day_condition = condition_codes[day_data.weatherCode];
    var day_description = day_data.weatherDesc[0].value;
    var date = day_data.date.split('-');
    var day = days[((new Date().getDay() + i) % 7)][0];
    var html = '<div class="day"' + i + '">' +
                                '<div class="date">' + day + '</div>' +
                                '<div class="icon ' + day_condition + '"' +
                                        ' title="' + day_description + '"></div>' +
                                '<div class="high">' + day_data['tempMax' + temp] + '&deg;</div>' +
                                '<div class="low">' + day_data['tempMin' + temp] + '&deg;</div>' +
                            '</div>';
    return html;
}

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// init

function initHandlers() {
    $('.close').click(function() {
        window.close();
    });

    $('input[name="temp-type"]').change(function() {
        // TODO: this is firing twice per change!
        temp = $('input[name="temp-type"]:checked').val();
        chrome.storage.sync.set({ 'temp' : temp });
        updateAllWeatherData();
    });

    $('#dots .dot').live('click', function() {
        // TODO fix this up
        var id = $(this).attr('class').split(' ')[1];
        selectCity(cities.findById(id));
    });
    
    $('.delete').live('click', function() {
        var id = $(this).parent().attr('class').split(' ')[1];
        deleteCity(cities.findById(id));
    });

    $('.new .add').click(function() {
        var searchterm = $('#new-city').val();
        var searchurl = base_searchterm_url + searchterm;
        // TODO: this will call onerror asyncronously -- should disable textbox during that time?
        attemptAddCity(searchurl, hideInputError, showInputError.bind(null, searchterm));
    });
    
    $('#new-city').keyup(function(e) {
        if (event.which == 13) // enter
            $('.new .add').click();
        if (event.which == 27) // esc
            $('.new .cancel').click();
    });
    
    $('.new .cancel').click(function() {
        hideSettings();
    });

    $('#info').click(function() {
        if (currentlyOnSettingsPage())
            hideSettings();
        else
            showSettings();
    });


    $('#dots #next.shown').live('click', function() {
        adjustnext(num_dots_at_bottom);
    });
    
    $('#dots #prev.shown').live('click', function() {
        adjustprev(num_dots_at_bottom);
    });

    $(document).bind('swipeleft', function() {
        if (currentlyOnSettingsPage())
            return;
        adjustnext(1);
    });

    $(document).bind('swiperight', function() {
        if (currentlyOnSettingsPage())
            return;
        adjustprev(1);
    });

    $(document).keyup(function(event) {
        if (currentlyOnSettingsPage())
            return;
        if (event.which == 39) // right-arrow
            adjustnext(1);
        else if (event.which == 37) // left-arrow
            adjustprev(1);
    });

    // disable page scrolling only on main page
    document.ontouchmove = function(e) {
        if (!currentlyOnSettingsPage())
            e.preventDefault();
    };

    document.addEventListener("backbutton" , function(e) {
        if (currentlyOnSettingsPage())
            hideSettings();
        else
            window.navigator.app.exitApp();
    }, false);     
}

$(document).ready(function() {

    $(document.body).addClass((window.cordova !== undefined) ? 'mobile' : 'not-mobile');

    chrome.storage.sync.get(function(items) {
        if (items.cities !== undefined && items.cities.version === Cities.CurrentVersion) {
            cities = items.cities;
            cities.__proto__ = Cities.prototype;
            cities.asArray().forEach(function(city) {
                city.__proto__ = City.prototype;
                city.date = new Date(city.date);
            });
            current_city = items.current_city;
        } else {
            cities = new Cities();
        }
        temp = items.temp;
        if (!temp) temp = 'F';
        $('input[name="temp-type"].' + temp).attr('checked', true);
        updateAllWeatherData();
    });

    attemptAddCurrentLocation();

    initHandlers();

    setInterval(function() {
        updateAllWeatherData();
    }, 1000 * 60 * 60 * 2);
});

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
