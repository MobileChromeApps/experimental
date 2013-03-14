// Initiate the `px.api` Object.
px.api = px.api || {};
px.api.login = new CustomEvent('px_api_login');
px.api.logout = new CustomEvent('px_api_logout');

// Store our consumer key.
px.api.consumerKey = '47HixZoC9snmw0OoJ6pHnky64gJ3WRBtx1IS3gRV';

/**
 * Function determines if the user is authenticated via OAuth.
 * @return Boolean.
 */
px.api.isAuthenticated = function() { return px.api.token ? true:false }

/**
 * Function generates parts of URI paramaters.
 * @param param_name as String.
 * @param root as String representing the root paramater in an array.
 */
px.api.encodeParamName = function(param_name, root) {
  if (root) return encodeURIComponent(root + '[' + param_name + ']');
  else return encodeURIComponent(param_name);
};

/**
 * Function takes object and returns it's parts as a string of paramaters
 * for use in a URI.
 * @param object as Object.
 * @param use as String (used for recursion).
 * @return String as paramaters for URI.
 */
px.api.objectToParams = function(object, root) {
  var string_parts = [];

  // Loop through object, extract all properties and append them
  // to the string_parts array.
  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      var value = object[property];
      if (value instanceof Array) {
        // Property is an array.
        for (var i = 0; i < value.length; i++) {
          var encoded_value = encodeURIComponent(value[i]),
              param_name = this.encodeParamName(property, root);
          string_parts.push(param_name + '%5B%5D=' + encoded_value);
        }
      } else if (typeof value == 'object') {
        // Property is an object.
        var param_name = this.encodeParamName(property, root);
        string_parts.push(this.objectToParams(value, param_name));
      } else {
        // Property is a string.
        var param_name = this.encodeParamName(property, root),
            URIComponent = encodeURIComponent(value);
        string_parts.push(param_name + '=' + URIComponent);
      }
    }
  }

  string_parts.sort();
  // Join our parts and return the string.
  return string_parts.join('&');
};

/**
 * Function takes URI paramaters and returns them as an object.
 * @param params as String.
 * @return paramaters as Object.
 */
px.api.paramsToObject = function(params) {
  if (params) {
    var paramatersArr = params.split('&'),
        paramaters = {};

    // Deconstruct URI paramaters into object.
    for (var i = 0; i < paramatersArr.length; i++) {
      paramatersArr[i] = paramatersArr[i].split('=');
      paramaters[paramatersArr[i][0]] = paramatersArr[i][1];
    }

    return paramaters;
  } else return {};
}

/**
 * Function generates obejct of paramaters from URI.
 * @param uri as String.
 * @return Object.
 */
px.api.getUriParams = function(uri) {
  var params = uri.slice(uri.indexOf('?') + 1);
  return px.api.paramsToObject(params);
}

/**
 * Function abstracts XHMHttpRequests for use with the 500px API.
 * @param method as String, `GET` or `POST`.
 * @param endpoint as String.
 * @param params as Object.
 * @param callback as Function to be called upon request completion.
 * @param validator as required by `px.utility.sendRecursiveXHR`.
 * @see http://github.com/500px/api-documentation/blob/master/endpoints/.
 * @return xhr as XMLHttpRequest.
 */
px.api.request = function(method, endpoint, params, callback, validator) {
  var xhr,
      url = 'https://api.500px.com/v1/' + endpoint,
      timeout = 5000;

  // Insert our consumer key into the paramaters.
  params.consumer_key = px.api.consumerKey;

  var unsignedUrl = url + '?' + this.objectToParams(params);

  var accessor = {
        token: px.api.token,
        tokenSecret: px.api.token_secret,
        consumerKey : px.api.consumerKey,
        consumerSecret: 'ZZ1R3w6gCeDh7dzXI6BhZ9CNEM7Ho9paeR1VJcbM'
      },
      message = {
        action: url,
        method: method,
        parameters: params
      };

  // Compose OAuth request url.
  OAuth.completeRequest(message, accessor);        
  OAuth.SignatureMethod.sign(message, accessor);

  // Set our newly signed paramaters.
  params = message.parameters;

  // Adjust url and post_data for method (GET or POST).
  if (method == 'GET') {
    if (params) url = url + '?' + this.objectToParams(params);
    post_data = null;
  } else {
    if (params) post_data = this.objectToParams(params);
    else post_data = null;
  }

  px.utility.sendRecursiveXHR(function(request) {
    // Logic determines if xhr is important (more likley to cache).
    var important = endpoint == 'photos' || endpoint.indexOf('activities') > -1;
    if (endpoint == 'photos') important = params.page < 4 ? important : false;
    important = params.feature != 'fresh_today' ? important : false;

    request.url = unsignedUrl;
    request.method = method;

    if (important) request.important = true;

    request.open(method, url, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  }, callback, validator, post_data);
}

px.api.authenticate = function() {
  // Request OAuth token.
  px.api.request(
  'POST',
  'oauth/request_token',
  {'oauth_callback': chrome.runtime.getURL('oauth_response.html')},
  function(xhr) {
    var url = '',
        webview = document.createElement('webview'),
        paramaters = px.api.paramsToObject(xhr.response);

    // Construct OAuth authorisation url.
    url = 'https://api.500px.com/v1/oauth/authorize'
        + '?oauth_token=' + paramaters.oauth_token;

    chrome.experimental.identity.launchWebAuthFlow(
      {url : url, interactive: true, width: 1200, height: 600},
      function(response) {
        var response = px.api.getUriParams(response);
        px.api.token = paramaters.oauth_token;
        px.api.token_secret = paramaters.oauth_token_secret;
        px.api.request(
          'POST',
          'oauth/access_token',
          {'oauth_verifier': response.oauth_verifier},
          function(xhr) {
            paramaters = px.api.paramsToObject(xhr.response);
            px.api.token = paramaters.oauth_token;
            px.api.token_secret = paramaters.oauth_token_secret;
            if (px.api.token && px.api.token_secret) {
              window.dispatchEvent(px.api.login);

              // User is unable to complete authenticated request to 
              // `activities/friends` (401), unless user has already taken
              // another authenticated request, this line provides
              // that request. I don't know if this is a bug in the API or if
              // there is somthing else going on here.
              px.api.request('GET', 'users', {}, function() {});
            }
        });
      }
    );
  });
}

