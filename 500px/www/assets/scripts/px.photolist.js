px.photolist = {};
px.photolist.unitSize = 200;

/**
 * Function creates and stores lists of photos for view.
 * @param listName as String.
 * @param patams as Object to be appended to api request.
 */
List = Class.extend({
  reinit: function() {
    px.photolist.attach(this);
    this.index = 0;
    return this;
  },
  init: function(listName, style, endpoint, params, Page) {
    // Don't instantiate this Class directly, use Grid as default.
    if (this instanceof arguments.callee.caller) {
      return new Grid(listName, endpoint, params, Page);
    }

    // If List matching this description already exists, use that instead.
    Page._lists = Page._lists || {};
    if (typeof Page._lists[listName] == 'undefined') {
      Page._lists[listName] = this;
    } else {
      return Page._lists[listName].reinit();
    }

    var List = this;

    this.Page = Page;
    this.name = listName; 
    this.photos = [];
    this.index = 0;
    this.pageNumber = 0;
    this.style = style;
    this.params = params;
    this.rowsPerPage = 8;

    this.fin = new Page.CustomEvent('fin');
    this.redraw = new Page.CustomEvent('redraw');
    this.resize = new Page.CustomEvent('resize');

    /**
     * Function acts as controller for angular.js module `photolist`.
     */
    this.controller = function controller($scope) {
      var render = function() {
        $scope.photoSize = style == 'grid' ? 280 : false;
        if (!$scope.$$phase) $scope.$apply();
        List.updateReady();
      };

      $scope.style = List.style;
      $scope.List = List;

      Page.loadActions.loadMore = function(active, callback) {
        var i = List.rowsPerPage,
            photoCount = $scope.photos.length;
        (function recurse() {
          List.getNewRow(function(row) {
            px.utility.sanitizePhotosForView(row);
            $scope.photos = _.union($scope.photos, row);
            render();

            if (!--i) {
              render();
              callback();
            } else recurse();
          });
        })();
      };

      $scope.photos = [];
      Page.activeLoadActions['loadMore'] = true;
      Page.dispatchEvent(Page.load);

      Page.addEventListener('ready', function() {
        $scope.allPhotos = List.photos;
      });

      Page.addEventListener('redraw', function() {
        List.index = 0;
        $scope.photos = [];

        Page.activeLoadActions['loadMore'] = true;
        Page.dispatchEvent(Page.load);
      });


      // Redraw the last row to make sure we don't have orphaned photos.
      Page.addEventListener('resize', function() {
        var itemsInLastRow = $scope.photos.length % List.listWidth(),
            i = itemsInLastRow;
        if (style != 'grid') return;
        if (!itemsInLastRow) return;

        while (i--) $scope.photos.pop();
        List.index -= itemsInLastRow;
        List.getNewRow(function(photos) {
          // Ensure the user hasn't switched views while we were gone.
          $scope.photos = _.union($scope.photos, photos);
          _.defer(render);
        });
      });

      $scope.setRoute = function(app, route, options) {px.utility.setRoute(app, route, options)}
    }

    if (px.index) {
      px.photolist.attach(List);
    } else {
      Page.addEventListener('open', function() {
        px.photolist.attach(List);
        Page.removeEventListener('open', arguments.callee);
      });
    }
  }
});

Grid = List.extend({
  init: function(listName, endpoint, params, Page) {
    var List = this;
    var style = 'grid';
    this.imageSize = 3;
    /**
     * Function gets a full row of photos based on the screen width.
     * @param callback as Function accepting paramater `photos`.
     */
    this.getNewRow = function(callback) {
      var rowWidth = this.listWidth(),
          photos = [],
          rowHeight = 0,
          photoWidth = 1;
      // Loop over `rowWidth` until we have enough photos.
      (function recurse() {
        List.getNextPhoto(function(photo) {
          if (photo) {
            photo.class = px.photolist.getSize(photoWidth, rowHeight);
            photos.push(photo);
            rowWidth -= photoWidth;
          } else rowWidth = 0;

          if (rowWidth) recurse();
          else callback(photos);
        });
      })()
    }

    /**
     * Function interacts with 500px api to fetch next photo in photo list.
     * @param callback as Function.
     */
    this.getNextPhoto = function(callback) {
      var photo = List.photos[List.index];
      var failed = false;

      if (typeof photo != 'undefined') {
        List.index++;
        callback(photo)
      } else failed = true;

      if (List.loading) return;

      // Make sure we have extra photos.
      if (typeof List.photos[List.index + 50] != 'undefined') return;
      if (!failed) return;

      var params = _.extend(List.params, {
        page: ++List.pageNumber,
        rpp: 100,
        image_size: px.utility.image_sizes,
        exclude: 'Nude' // @TODO look at the user's preferences first
      });
      List.loading = true;
      px.api.request('GET', endpoint, params,
        function(xhr) {
          var response = JSON.parse(xhr.response);
          var photos = response.photos;

          // Filter any duplicate photos.
          photos = _.filter(photos, function(photo) {
            var include = !(_.where(List.photos, {id: photo.id}).length);
            if (include) return photo;
          });

          List.photos = _.union(List.photos, photos);

          // Escape if we're out of photos.
          if (List.photos.length <= List.index) {
            callback(false);
            return;
          }

          List.loading = false;

          // Try again.
          if (response.total_items && failed) List.getNextPhoto(callback);
      });
    }

    this._super(listName, style, endpoint, params, Page);
  }
});

Flow = List.extend({
  init: function(listName, endpoint, params, Page) {
    var List = this;
    var style = 'flow';
    this.imageSize = 4;

    /**
     * Function gets a full row of flow photos based on the screen width.
     * @param callback as Function accepting paramater `photos`.
     */
    this.getNewRow = function(callback) {
      var rowWidth = List.listWidth(),
          rowHeight = 0,
          photos = [],
          reservation = false,
          layouts = [],
          layout = {},
          profile = [],
          similar = [],
          stops = List.lastRowProfile;

      (function recurse() {
        List.getNextPhoto(function(action) {
          // No photos, callback.
          if (!action) {
            callback([]);
            return;
          }

          // Determine photo orientation.
          var photo = action.items[0],
              ratio = photo.width / photo.height,
              orientation = ratio - 1.25 > 0 ? 'landscape' : 'portrait';

          if (!reservation) {
            // Get the best fit for this box.
            if (orientation == 'landscape') {
              layouts = [{w:4, h:2}, {w:3, h:2}, {w:2, h:1}, {w:2, h:2}];
            }
            if (orientation == 'portrait') {
              layouts = [{w:1, h:2}, {w:2, h:2}];
            }

            // Filter out layouts that won't fit.
            layouts = _.filter(layouts, function(layout) {
              return layout.w <= rowWidth;
            });

            // Ensure we still have at least one layout, if not put in the
            // smallest one (it's sure to fit, but is not ideal for landscapes).
            if (!layouts.length) layouts = [{w:1, h:2}];

            // Pick layout that best fits the photo.
            layout = layouts.sort(function(a, b) {
              var aRatio = a.w / a.h;
              var bRatio = b.w / b.h;
              return Math.abs(aRatio - ratio) < Math.abs(bRatio - ratio);
            })[0];

            // If the layout has a height of 1, we need the next layout to be
            // exactly the same size, so create a reservation.
            if (layout.h == 1) {
              reservation = layout;
            }
          } else {
            layout = reservation;
            reservation = false;
          }

          photo.class = px.photolist.getSize(layout.w, layout.h);
          photo.actor = action.actor;
          photo.px_photolist_action = px.photolist.getActionString(
            action.action,
            action.actor,
            photo);
          photos.push(photo);
          if (!reservation) rowWidth -= layout.w;
          
          if (rowWidth > 0) {
            profile.push(layout);
            recurse();
          }
          else if (reservation) recurse();
          else {
            profile.push(layout);
            if (stops) {
              // Flip odd rows.
              if (_.last(stops).w < _.first(stops).w) {
                profile.reverse();
                photos.reverse();
              }
              
              // If the left blocks are the same size, flip it.
              if (_.first(stops).w == _.first(profile).w) {
                profile.reverse();
                photos.reverse();
              }
            }
            
            List.lastRowProfile = profile;
            px.utility.sanitizePhotosForView(photos);
            callback(photos);
          }
        });
      })();
    }

    /**
     * Function interacts with 500px api to fetch next action in photo list.
     * @param callback as Function.
     */
    this.getNextPhoto = function(callback) {
      var action = List.photos[List.index];
      var failed = false;

      if (typeof action != 'undefined') {
        List.index++;
        callback(action)
      } else failed = true;

      if (List.loading) return;

      // Make sure we have extra photos.
      if (typeof List.photos[List.index + 10] != 'undefined') return;
      if (List.loading == true) return;

      var params = _.extend(List.params, {
        rpp: 20,
        image_size: px.utility.image_sizes,
        include_states: true,
        exclude: 'Nude' // @TODO look at the user's preferences first
      });
      List.loading = true;
      if (List.pageNumber) params.to = List.pageNumber;
      px.api.request('GET', endpoint, params,
        function(xhr) {
          var response = JSON.parse(xhr.response),
              actions = response.groups;

          List.pageNumber = response.to;
          List.photos = _.union(List.photos, actions);

          if (List.photos.length <= List.index || !actions) {
            callback(false);
            return
          }

          List.loading = false;

          // Try again.
          if (failed) List.getNextPhoto(callback);
      });
    }

    this._super(listName, style, endpoint, params, Page);
  }
});

px.photolist.getActionString = function(actionId, actor, photo) {
  var userName = px.utility.getUserName(actor),
      action = '';

  switch (actionId) {
    case 1:
      action += ' commented on ';
      break;
    case 2:
      action += ' favourited ';
      break;
    case 3:
      action += ' liked ';
      break;
    default:
      action += ' uploaded ';
      break;
  }

  return action;
}

/**
 * Function generates string for use with css as needed by flow.
 */
px.photolist.getSize = function(width, height) {
  return '_' + width + 'x' + height
       + ' width-' + width
       + ' height-' + height;
}
