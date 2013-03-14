// Initiate `px.utility` Object.
px.utility = {};

px.utility.image_sizes = [3, 4, 5];

px.utility.photoCache = {};

/**
 * Utility function generates the user's full name.
 * @TODO extend to accept character limit.
 * @param user
 * @return name
 */
px.utility.getUserName = function(user) {
  var name = '';
  if (user.firstname) name += user.firstname + ' ' + user.lastname;
  else name = user.username;
  return name;
}

/**
 * Utility function fetches desired image object from photo.
 * @param photo as Object as supplied from the 500px API.
 * @param image_size as Integer.
 * @param callback as Function.
 */
px.utility.getImageFromPhoto = function(photo, image_size, callback) {
  callback = callback || function() {};
  var image = _.find(photo.images, function(image) {
    if (image.size == image_size) {
      callback(image);
      return true;
    }
    return false;
  }); 
  return image;
}

/**
 * Function will recursivly send XHR requests when internet connection drops.
 * @param createXHR as Function that accepts and updates paramater `request`
 *  as xmlHttpRequest. This function must add a `url` and `method` paramater
 *  to the request.
 * @param callback as Function.
 * @param validator as Function that determines if scope is still valid.
 * @param postData as data for XMLHttpRequest.send().
 * @param delay as recursion delay.
 */
px.utility.sendRecursiveXHR = function(createXHR, callback, validator, postData, delay) {
  var retry = function() {
        var minDelay = 200;
        var maxDelay = 32000;
        var cachedRequest = px.utility.getCachedXHR(request);

        delay = delay * 2 || minDelay;
        if (delay > maxDelay) delay = maxDelay;

        px.utility.setOfflineMode(true);

        if (!cachedRequest) {
          setTimeout(function() {
            if (validator()) {
              px.utility.sendRecursiveXHR(
                createXHR,
                callback,
                validator,
                postData,
                delay
              );
            }
          }, delay);
        } else if (validator()) callback(cachedRequest);
      },
      request = new XMLHttpRequest();

  
  validator = validator || function() {return true};
  postData = postData || null;

  createXHR(request);

  request.onreadystatechange = function(e) {
    if (request.readyState == 4) {
      if (request.status) {
        if (validator()) callback(request);
        px.utility.cacheXHR(request);
        px.utility.setOfflineMode(false);
      } else retry();
    }
  };
  request.send(postData);
}

px.utility.XHRCache = [];
px.utility.XHRCacheKey = 'XHRcache';
chrome.storage.local.get(px.utility.XHRCacheKey, function(items) {
  if (!px.utility.XHRCache.length) {
    px.utility.XHRCache = items[px.utility.XHRCacheKey];
  }
});

/**
 * Function adds XHR to cache.
 * @param Object.
 */
px.utility.cacheXHR = function(request) {
  if (request.method == 'GET') {
    px.utility.XHRCache = _.reject(px.utility.XHRCache, function(record) {
      if (record) return record[0] == request.url;
      else return true;
    });
    px.utility.XHRCache.push([request.url, {
      request: {
        url: request.url,
        important: request.important,
        response: request.response
      },
      time: new Date().getTime(),
      size: px.utility.getObjectSizeInBytes(request)
    }]);
  }
  px.utility.updateXHRCache();
}

/**
 * Function returns cached XHR if it exists.
 * @param request;
 */
px.utility.getCachedXHR = function(request) {
  var cachedRequest;
  if (request.method == 'GET') {
    cachedRequest = _.find(px.utility.XHRCache, function(record) {
      return record[0] == request.url;
    });
    if (cachedRequest) return cachedRequest[1].request;
  }
}

/**
 * Function updates XHR cache by removing old items and storing it for future
 * use in `chrome.storage`.
 */
px.utility.updateXHRCache = _.debounce(function() {
  var maxSize = 33554432; // 32MB -> bytes.
  var cacheSize = px.utility.getObjectSizeInBytes(px.utility.XHRCache);

  if (cacheSize > maxSize) {
    var cache = _.sortBy(
      px.utility.XHRCache,
      function(i) { return i[1] ? -i[1].time : 0; }
    );

    // Recursivly remove old items until we're below our max.
    (function recurse() {
      var record = _.last(cache);
      var remove = function () {
        cache.pop();
        if (!record[1]) return;
        cacheSize -= record[1].size;
        if (cacheSize > maxSize) recurse();
      }
      if (!record[1]) remove();
      else if (!record[1].request.important) remove();
    })();

    px.utility.XHRCache = cache;
  }

  var requestObj = {};
  requestObj[px.utility.XHRCacheKey] = px.utility.XHRCache;
  chrome.storage.local.set(requestObj);
}, 5000);

/**
 * Function provides an approximate value for the size of an object.
 * @param Object.
 * @return Number.
 * @see http://stackoverflow.com/questions/1248302/javascript-object-size/11900218#11900218.
 */
px.utility.getObjectSizeInBytes = function(object) {
  var objectList = [];
  var stack = [object];
  var bytes = 0;

  while (stack.length) {
    var value = stack.pop();
    if (typeof value === 'boolean') bytes += 4;
    else if (typeof value === 'string') bytes += value.length * 2;
    else if (typeof value === 'number') bytes += 8;
    else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
      objectList.push(value);
      for (var i in value) {
        try {
          if (value[i].size && i == 'response') bytes += value[i].size;
          stack.push(value[i]);
          stack.push(i);
        } catch(e) {};
      };
    }
  }
  return bytes;
}

/**
 * Function fetches image as blob url and provides it as first paramater
 * of param `callback`.
 * @param url as as String representing fully-qualified url.
 * @param callback as Function accepting paramater base64 as String.
 */
px.utility.getRemoteImage = function(url, callback) {
  var request = new XMLHttpRequest();

  // Single-case correction for non-fully-qualified url coming from API.
  if (url == '/graphics/userpic.png') url = 'http://500px.com/graphics/userpic.png';

  px.utility.sendRecursiveXHR(function(request) {
    request.url = url;
    request.method = 'GET';
    request.open('GET', url, true);
    request.responseType = 'blob';
  }, function(request) {
    var url = window.webkitURL.createObjectURL(request.response);
    callback(url);
  });
}

/**
 * Function takes photo object as returned from the API and returns a new object
 * that is better formed for rendering with AngularJS.
 *
 * @param photo as Object.
 * @return clean as Object.
 */
px.utility.sanitizePhotoForView = function(photo, image_size) {
  var clean = {},
      hasDesc = photo.description ? true : false,
      noDesc = 'Sorry, we don\'t have a description for this photo.';

  photo.alt = hasDesc ? px.utility.collapseString(photo.description) : noDesc;

  photo.uploaded = px.utility.getTimeAgo(photo.created_at);
  if (photo.taken_at) photo.taken = px.utility.getDate(photo.taken_at);
  if (photo.category) photo.category_name = px.utility.getCategory(photo.category);
  photo.description = px.utility.parseSafeHtml(photo.description);

  // Flow specific attributes.
  if (photo.px_photolist_size) {
    photo.class += photo.px_photolist_size;
  }
  if (photo.px_photolist_actor) {
    photo.actor = photo.px_photolist_actor;
    photo.acton_title = photo.name;
  }

  return photo;
}

/**
 * Function prepares set of photos for view.
 * @param photos as Array.
 * @return Array.
 * @see px.utility.sanitizePhotoForView().
 */
px.utility.sanitizePhotosForView = function(photos, image_size) {
  for (var photo in photos) {
    photos[photo] = px.utility.sanitizePhotoForView(photos[photo], image_size);
  }
}

/**
 * Sanitize naughty HTML elements.
 * If a tag containing any of the words in the list below is found, the tag
 * gets converted to entities.
 * So <blink> becomes: &lt;blink&gt;
 *
 * @param str.
 * @see https://github.com/chriso/node-validator/blob/master/lib/xss.js#L157.
 * @return str.
 */
px.utility.filterXSS = function(str) {
  var naughty = 'a|alert|applet|audio|basefont|base|behavior|bgsound|blink|body|embed|expression|form|frameset|frame|head|html|ilayer|iframe|input|isindex|layer|link|meta|object|plaintext|style|script|textarea|title|video|xml|xss';
  if (!str) str = '';
  str = str.replace(new RegExp('<(/*\\s*)('+naughty+')([^><]*)([><]*)', 'gi'), function(m, a, b, c, d) {
      return '&lt;' + a + b + c + d.replace('>','&gt;').replace('<','&lt;');
  });
  return str;
}

/**
 * Function escapse string for XSS and removes new lines.
 * @param str.
 * @return str.
 */
px.utility.collapseString = function(str) {
  str = px.utility.filterXSS(str);
  str = str.replace(/(\r\n|\n|\r)/gm, ' ');
  return str;
}

/**
 * Function sets routes between angular apps.
 *
 * @param app as String representing name of Angular app.
 * @param route representing the route to pass to the app.
 * @param options as object.
 */
px.utility.setRoute = _.throttle(function(app, route, options) {
  switch (app) {
    case 'photoview':
      px.photoview.setRoute(route, options);
      break;
    case 'userview':
      px.userview.setRoute(route, options);
      break;
    case 'feature':
      px.feature.setRoute(route, options);
      break;
    default: return;
  }
}, 250);

px.utility.modal = {};
px.utility.modal.open = new CustomEvent('px_utility_modal_open');
px.utility.modal.close = new CustomEvent('px_utility_modal_close');

/*
 * Function takes an ISO time and returns a string representing how long ago
 * the date represents.
 * @param String as ISO datetime.
 * @return String.
 * @see http://ejohn.org/files/pretty.js
 */
px.utility.getTimeAgo = function(time) {
	var date = new Date(time),
		diff = ((new Date().getTime() - date.getTime()) / 1000),
		day_diff = Math.floor(diff / 86400);

	var timeAgo = day_diff == 0 && (
      diff < 60 && 'just now' ||
      diff < 120 && '1 minute ago' ||
      diff < 3600 && Math.floor( diff / 60 ) + ' minutes ago' ||
      diff < 7200 && '1 hour ago' ||
      diff < 86400 && Math.floor( diff / 3600 ) + ' hours ago') ||
		day_diff == 1 && 'Yesterday' ||
		day_diff < 7 && day_diff + ' days ago' ||
		Math.ceil( day_diff / 7 ) + ' weeks ago';
  return timeAgo;
}

/**
 * Function takes an ISO time and returns string representing date.
 * @param String as ISO datetime.
 * @return String.
 */
px.utility.getDate = function(time) {
  var date = new Date(time);
  var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return (
    monthNames[date.getMonth()] + ' ' + 
    date.getDate() + ' ' + 
    date.getFullYear()
  );
}

/**
 * Function converts category ids to category names.
 * @param `id` as Number.
 * @return `name` as String.
 */
px.utility.getCategory = function(id) {
  var name;
  switch (id) {
    case 10: name = 'Abstract'; break;
    case 11: name = 'Animals'; break;
    case 5:  name = 'Black and White'; break;
    case 1:  name = 'Celebrities'; break;
    case 9:  name = 'City and Architecture'; break;
    case 15: name = 'Commercial'; break;
    case 16: name = 'Concert'; break;
    case 20: name = 'Family'; break;
    case 14: name = 'Fashion'; break;
    case 2:  name = 'Film'; break;
    case 24: name = 'Fine Art'; break;
    case 23: name = 'Food'; break;
    case 3:  name = 'Journalism'; break;
    case 8:  name = 'Landscapes'; break;
    case 12: name = 'Macro'; break;
    case 18: name = 'Nature'; break;
    case 4:  name = 'Nude'; break;
    case 7:  name = 'People'; break;
    case 19: name = 'Performing Arts'; break;
    case 17: name = 'Sport'; break;
    case 6:  name = 'Still Life'; break;
    case 21: name = 'Street'; break;
    case 26: name = 'Transportation'; break;
    case 13: name = 'Travel'; break;
    case 22: name = 'Underwater'; break;
    case 27: name = 'Urban Exploration'; break;
    case 25: name = 'Wedding'; break;
    case 0:  name = 'Uncategorized'; break;
  }
  return name;
}

px.utility.parseSafeHtml = function(text) {
  if (typeof(text) != 'string' || text == null) return '';
  text = text.replace(/\r\n?/g, "\n");
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  text = text.replace(/\n?&lt;blockquote&gt;\n*(.+?)\n*&lt;\/blockquote&gt;/igm, "<blockquote>$1</blockquote>");
  text = text.replace(/\n?&lt;br*(.+?)&gt;/gim, "<br>");
  text = text.replace(/\n?&lt;p&gt;/gim, "<br>");
  text = text.replace(/\n?&lt;\/p&gt;/gim, "<br><br>");
  for (tag in ['b','i','em','strong','u']) {
    var regex = new RegExp("&lt;" + tag + "&gt;(.+?)&lt;/" + tag + "&gt;", 'igm');
    text = text.replace(regex, "<" + tag + ">$1</" + tag + ">");
  }
  text = text.replace(/&lt;a.{1,500}?href\s*=\s*['"](http:\/\/.{1,500}?)["'].*?&gt;(.{1,500}?)&lt;\/a&gt;/gim, '<a href="$1" target="_blank" rel="nofollow">$2</a>');
  text = text.replace(/&lt;a.{1,500}?href\s*=\s*['"](https:\/\/.{1,500}?)["'].*?&gt;(.{1,500}?)&lt;\/a&gt;/gim, '<a href="$1" target="_blank" rel="nofollow">$2</a>');
  text = text.replace(/&lt;a.{1,500}?href\s*=\s*['"](.{1,500}?)["'].*?&gt;(.{1,500}?)&lt;\/a&gt;/gim, '<a href="http://$1" target="_blank" rel="nofollow">$2</a>');
  text = text.replace(/\n\n+/g, "<br><br>");
  text = text.replace(/([^\n]\n)(?=[^\n])/,"$1<br/>");

  return text;
}

