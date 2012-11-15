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
const base_city_url = 'http://maps.googleapis.com/maps/api/geocode/json?sensor=false&latlng=';

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

function City(name, searchterm) {
    // TODO: remove name/searchterm and just have one canonical name (paris, canada vs paris, france etc)
    this.name = name;
    this.searchterm = searchterm;
    this.date = new Date();
}

function Cities() {
    this.cities = [];
    this.version = Cities.CurrentVersion;
}

Cities.prototype.CurrentVersion = 2;

Cities.prototype.add = function(city) {
    this.cities.push(city);
    chrome.storage.sync.set({ 'cities': this });
}

Cities.prototype.remove = function(city) {
    this.cities.splice(this.cities.indexOf(city), 1);
    chrome.storage.sync.set({ 'cities': this });
}

Cities.prototype.length = function() {
    return this.cities.length;
}

Cities.prototype.findByKey = function(key, value) {
    for (var i = 0; i < this.cities.length; ++i) {
        var city = this.cities[i];
        if (city[key] === value) {
            return city;
        }
    }
    return null;
}

Cities.prototype.findByName = function(value) {
    return this.findByKey("name", value);
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

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// globals

var temp = 'F';
var cities = null;
var current_city = null;

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// helpers

function sizeOf(dictionary) {
    var count = 0;
    for (var key in dictionary) {
        if (dictionary.hasOwnProperty(key)) count++;
    }
    return count;
}

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// "controller"

function selectCity(city) {
    // TODO save city selection on app exit

    if (!city)
        return;

    current_city = city.name;
    chrome.storage.sync.set({current_city: current_city});
    
    $('.forecast').removeClass('selected');
    $('.dot').removeClass('selected');
    $('.' + city.name).addClass('selected');
}

function deleteCity(city) {
    if (!city)
        return;
    $('.' + city.name).remove();
    cities.remove(city);
    selectCity(getCurrentCity());
}

function addCity(searchterm) {
    var name = searchterm.split(', ')[0].toLowerCase().split(' ').join('-');
    if (cities.findByName(name) != null) {
        return;
    }
    var city = new City(name, searchterm);
    cities.add(city);
    selectCity(city);
    refresh();
    return city;
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

function getCurrentCity() {
    var city = cities.findByName(current_city);
    if (!city && cities.length() > 0)
        city = cities.asArray()[0];
    return city;
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

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// current geolocation

function getCurrentPosSuccessFunction(position) {
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    var url = base_city_url + lat + ',' + lng;

    $.get(url, function(data) {
        var address_components = null;
        for (var i = 0; i < data.results.length; i++) {
            var component_types = data.results[i].types;
            if ((component_types.indexOf('street_address') != -1) || (component_types.indexOf('locality') != -1)) {
                address_components = data.results[i].address_components;
                break;
            }
        }

        if (!address_components)
            return;

        var city = '';
        var country = '';
        for (var j = 0; j < address_components.length; j++) {
            if (address_components[j].types.indexOf('locality') != -1) {
                city = address_components[j].long_name;
            }
            if (address_components[j].types.indexOf('country') != -1) {
                country = address_components[j].short_name;
            }
        }

        addCity(city + ', ' + country);
    }, 'json');
}

function getCurrentPosErrorFunction(error) {
    console.log("Geocoder failed");
    showSettings();
}

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
// "view"

function getWeatherData(city, onsuccess, onerror) {
    var url = encodeURI(base_weather_url + city.searchterm);
    $.get(url, function(data) {
        if (!data.data.error) {
            var current_condition = data.data.current_condition[0];
            var weather = data.data.weather;
            onsuccess(city, current_condition, weather);
        } else {
            onerror(city);
        }
    }, 'json');
};

function refresh() {
    cities.asArray().forEach(function(city) {
        getWeatherData(city,
            function(city, current_condition, weather) {
                addLocationDisplay(city, current_condition, weather);
            }, function(city) {
                //TODO: handle error?
            });
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
            $('#dots .dot.' + c[l].name).addClass('shown');

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

function addLocationDisplay(city, current_condition, weather) {
    // First, remove old city data
    $('.' + city.name).remove();

    var description = condition_codes[current_condition.weatherCode];
    var forecast_html = '<div class="forecast ' + city.name + ' ' + description + '"></div>';
    var dot_html = '<div class="dot ' + city.name + '" title="' + city.name + '"></div>';
    var city_html = '<div class="city">' + city.name.toUpperCase() + '</div>';
    var cities_list_html = '<div class="city-list ' + city.name + '"><div class="delete"></div>' + city.searchterm + '</div>';
    var current_html = currentDisplay(current_condition);
    var tempMax = weather[0]['tempMax' + temp];
    var tempMin = weather[0]['tempMin' + temp];
    var high_low = '<div class="high_low">' + tempMax + '&deg; / ' + tempMin + '&deg;</div>';
    var day_html = '';
    // TODO: remplace this with weather.map(dayDisplay).join or reduce or forEach
    for (var i = 0; i < weather.length; i++) {
        day_html += dayDisplay(weather, i);
    }

    // update the UI
    $('#settings .cities-list').append(cities_list_html);
    $('#weather').append(forecast_html);
    $('#weather .' + city.name).append(current_html);
    $('#weather .' + city.name).append(high_low);
    $('#weather .' + city.name).append(city_html);
    //$('#weather .' + city.name).append(day_html);
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

function dayDisplay(weather, i) {
    var day_data = weather[i];
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

    $('input[name="temp-type"]').change(function() { // TODO: this is firing twice per change!
        temp = $('input[name="temp-type"]:checked').val();
        chrome.storage.sync.set({ 'temp' : temp });
        refresh();
    });

    $('#dots .dot').live('click', function() {
        // TODO fix this up
        var name = $(this).attr('class').split(' ')[1];
        selectCity(cities.findByName(name));
    });
    
    $('.delete').live('click', function() {
        var name = $(this).parent().attr('class').split(' ')[1];
        deleteCity(cities.findByName(name));
    });

    $('.new .add').click(function() {
        var searchterm = $('#new-city').val();
        getWeatherData(new City(null, searchterm),
            function(city) {
                var city = addCity(city.searchterm);
                hideInputError();
            }, function(city) {
                showInputError(city.searchterm);
            });
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
        if (currentlyOnSettingsPage()) {
            hideSettings();
        } else {
            showSettings();
        }
    });


    $('#dots #next.shown').live('click', function() {
        adjustnext(num_dots_at_bottom);
    });
    
    $('#dots #prev.shown').live('click', function() {
        adjustprev(num_dots_at_bottom);
    });

    $(document).bind('swipeleft', function() {
        if (currentlyOnSettingsPage()) {
            return;
        }
        adjustnext(1);
    });

    $(document).bind('swiperight', function() {
        if (currentlyOnSettingsPage()) {
            return;
        }
        adjustprev(1);
    });

    $(document).keyup(function(event) {
        if (currentlyOnSettingsPage()) {
            return;
        }
        if (event.which == 39) // right-arrow
            adjustnext(1);
        else if (event.which == 37) // left-arrow
            adjustprev(1);
    });

    // disable page scrolling only on main page
    document.ontouchmove = function(e) {
        if (!currentlyOnSettingsPage()) {
            e.preventDefault();
        }
    };

    document.addEventListener("backbutton" , function(e) {
        if (currentlyOnSettingsPage()) {
            hideSettings();
        } else {
            window.navigator.app.exitApp();
        }
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
            });
            current_city = items.current_city;
            refresh();
        } else {
            cities = new Cities();
            for (var searchterm in items.cities) {
                getWeatherData(new City(null, searchterm),
                    function(city) {
                        addCity(city.searchterm);
                    }, function(city) {
                        // TODO: handle error?
                    });
            }
        }
        temp = items.temp;
        if (!temp) temp = 'F';
        $('input[name="temp-type"].' + temp).attr('checked', true);
        navigator.geolocation.getCurrentPosition(getCurrentPosSuccessFunction, getCurrentPosErrorFunction);
    });

    initHandlers();

    setInterval(function() {
        refresh();
    }, 1000 * 60 * 60 * 2);
});

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/
