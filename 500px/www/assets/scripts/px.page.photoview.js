chrome.app.runtime.onLaunched.addListener(function() {
  px.photoview = new Page('photoview');
  px.photoview.imageSize = 4;
  px.photoview.activePhoto = 0;
  px.photoview.index = 0;
  /**
   * Function acts as photoview controller for Angular.js.
   */
  px.photoview.controller = function($scope, $location) {
    px.photoview.render = _.debounce(function() {
      $scope.$apply();
    }, 275, true);
    px.photoview.setActivePhoto = function(photo) {
      var callback = function(xhr) {
        if (xhr) photo = JSON.parse(xhr.response).photo;
        px.photoview.activePhoto = photo;
        $scope.activePhoto = photo;
        commentPage = 0;

        // Ensure we have the most up-to-date photo in full format.
        px.api.request('GET', 'photos/' + photo.id, {
          include_states: true,
          image_size: px.utility.image_sizes
        }, function(xhr) {
          // Callback.
          var newPhoto = JSON.parse(xhr.response).photo;
          photo = _.extend(photo, newPhoto);
          px.utility.sanitizePhotoForView(photo);
          $scope.activePhoto = photo;
          $scope.favoriteMethod = photo.favorited ? 'DELETE' : 'POST';

          if (photo.latitude && photo.longitude) {
            px.utility.getRemoteImage(
              'http://maps.googleapis.com/maps/api/staticmap?'
              + px.api.objectToParams({
                  size: '400x250',
                  sensor: false,
                  zoom: 10,
                  markers:
                  photo.latitude + ', ' + photo.longitude
                }),
              function(url) {
                $scope.activePhoto.mappic = url;
                $scope.activePhoto.maplink = 'http://maps.google.com/maps?'
                  + px.api.objectToParams({
                    z: 10,
                    q: photo.latitude + ', ' + photo.longitude
                  });
                px.photoview.render();
            });
          } else {
            $scope.activePhoto.maplink = '';
            $scope.activePhoto.mappic = '';
          }
          px.photoview.render();
        }, function() { return px.photoview.activePhoto.id == photo.id });

        // Ensure we have the most up-to0date user object in full-format.
        px.api.request('GET', 'users/show', {id: photo.user.id},
          function(xhr) {
            var user = JSON.parse(xhr.response).user;
            px.photoview.activePhoto.user = user;

            // Social links.
            var remoteLink = 'http://500px.com/photo/' + $scope.activePhoto.id;
            $scope.activePhoto.fbUrl = 'https://www.facebook.com/dialog/feed?'
              + px.api.objectToParams({
                app_id: 24324666158,
                link: remoteLink,
                name: $scope.activePhoto.name,
                description: $scope.activePhoto.description,
                redirect_uri: remoteLink
            });
            $scope.activePhoto.twitterUrl = 'https://twitter.com/share?'
              + px.api.objectToParams({
                url: remoteLink,
                via: px.photoview.activePhoto.user.contacts.twitter || '500px',
                text: $scope.activePhoto.name
            });
            $scope.activePhoto.plusUrl = 'https://plus.google.com/share?'
              + px.api.objectToParams({
                url: remoteLink
            });
          px.photoview.render();
        }, function() { return px.photoview.activePhoto.user.id == photo.user.id });

        // Get profile photo.
        var userpic_url = px.photoview.activePhoto.user.userpic_url.replace('/1.jpg', '/2.jpg');
        px.utility.getRemoteImage(
          userpic_url,
          function(url) {
            $scope.activePhoto.userpic = url;
             px.photoview.render();
        });

        // Set `px.photoview.index`.
        // @TODO fix this, absctract `photoview.photos` to play nice with flow.
        for (var i in px.photoview.photos) {
          if (px.photoview.photos[i].id == photo.id) {
            px.photoview.index = Number(i);
            break;
          }
        }

        // Load surrounding photos.
        px.photoview.activeLoadActions.getNext = true;
        px.photoview.dispatchEvent(px.photoview.load);
      }

      // Acting as open event, instead of regular function.
      if (photo.type == 'open') {
        // Stop propogation, we'll trigger the load event ourself.
        photo.preventDefault();
        photo = px.photoview.activePhoto;
      }

      if (typeof photo == 'object') {
        // If we already have the photo object, move on.
        callback();
      } else {
        // If we don't have the photo object, retrieve it from `px.photoview.photos`.
        var photoId = photo;
        photo = _.find(px.photoview.photos, function(p){return p.id == photoId});
        px.photoview.activePhoto = photo;
        callback();
      }
    }

    $scope.closeDrawers = px.utility.closeDrawers;

    var commentPage = 0;
    $scope.getMoreComments = function() {
      var photoId = $scope.activePhoto.id;
      var params = {id: $scope.activePhoto.id, comments: true, comments_page: ++commentPage};
      if (!$scope.activePhoto.id) return;
      // Request photo comments.
      px.api.request(
        'GET',
        'photos/' + $scope.activePhoto.id,
        params,
        function(xhr) {
          if (params.comments_page == 1) $scope.activePhoto.comments = [];
          var response = JSON.parse(xhr.response);
          updateComments(response.comments);
        }, function() { return $scope.activePhoto.id == photoId });
    };

    var updateComments = function(comments) { 
      var i = 0;

      // Filter any duplicate comments.
      comments = _.filter(comments, function(comment) {
        var include = !(_.where($scope.activePhoto.comments, {id: comment.id}).length);
        if (include) return comment;
      });
      $scope.activePhoto.comments = _.union(
        $scope.activePhoto.comments,
        comments
      );

      (function recurse() {
        var comment = comments[i];
        if (typeof comment == 'undefined') return;
        var userpicUrl = comment.user.userpic_url.replace('/1.jpg', '/2.jpg');
        comment.created_at = px.utility.getTimeAgo(comment.created_at);
        i++;

        px.utility.getRemoteImage(
          userpicUrl,
          function(url) {
            comment.userpic_src = url;
            $scope.$apply();
            if (i < comments.length) recurse();
        });
      })();
    }

    px.photoview.addEventListener('close', function() {
      // Wait a moment so avatar dosen't dissapear while close animation is happening.
      setTimeout(function() {
        $scope.photos = [];
        $scope.activePhoto = {};
        $scope.$apply();
      }, 250);
    });

    px.photoview.addEventListener('open', px.photoview.setActivePhoto);

    px.photoview.addEventListener('ready', function(e) {
      var currentPhoto = _.find($scope.photos, function(p) {
        return p.id == px.photoview.activePhoto.id;
      });

      px.photoview.render();
    });

    /**
     * Function will update cache with next and previous photos if called no
     * more than once per second.
     */
    px.photoview.loadActions.getNext = _.throttle(function(action, callback) {
      var photos = [];
      for (var i in px.photoview.photos) {
        var photo;
        // Get photo object.
        photo = px.photoview.photos[i];

        if (Math.abs(px.photoview.index - i) < 13) photos.push(photo);
      }
      // Include only $scope.photos that also exist in photos.
      $scope.photos = _.filter($scope.photos, function(photo) {
        if (_.find(photos, function(p) {
          return p.id == photo.id;
        })) return true;
      });

      photos = _.reject(photos, function(photo) {
        if (_.find($scope.photos, function(p) {
          return p.id == photo.id;
        })) return true;
      });

      $scope.photos = _.union($scope.photos, photos);
      $scope.photos.sort(function(a, b) {
        a = _.find(px.photoview.photos, function(p){return p.id == a.id});
        b = _.find(px.photoview.photos, function(p){return p.id == b.id});
        return px.photoview.photos.indexOf(a) - px.photoview.photos.indexOf(b);
      });

      $scope.$apply();
      callback();
    }, 3000);

    $scope.photos = [];

    // Set routes between angular apps.
    $scope.setRoute = function(app, route, options) {px.utility.setRoute(app, route, options)}

    // Set route in our app.
    px.photoview.setRoute = function(route, List) {
      var routeParts = route.split('/');
      var style = typeof(List.photos[0].items) == 'undefined' ? 'grid' : 'flow';
      if (style == 'flow') {
        px.photoview.photos = _.map(List.photos, function(action) {
          return action.items[0];
        });
      } else {
        px.photoview.photos = List.photos;
      }
      px.photoview.List = List;
      px.photoview.activePhoto = routeParts[2];
      px.photoview.registerStateObject(px.photoview.photos, 'photos');
      px.photoview.registerStateObject(px.photoview.activePhoto, 'activePhoto');

      px.photoview.dispatchEvent(px.photoview.open);
    }

    $scope.commentValue = '';
    $scope.postComment = function() {
      if ($scope.commentValue.length) {
        px.api.request(
          'POST',
          'photos/' + $scope.activePhoto.id + '/comments',
          {id: $scope.activePhoto.id, body: $scope.commentValue},
          function(xhr) {
            var response = JSON.parse(xhr.response);
            // @TODO confirm that this works after tye pushes change to api.
            if (response.comment) {
              $scope.activePhoto.comments.unshift(response.comment);
              updateComments([response.comment]);
            }
        });
        $scope.commentValue = '';
      }
    }
    $scope.emailFrom = '';
    $scope.emailTo = '';
    $scope.emailMessage = '';
    $scope.sendEmail = function() {
      // @TODO this once tye pushes change to api.
    }
  }
});

