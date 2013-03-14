chrome.app.runtime.onLaunched.addListener(function() {
  px.userview = new Page('userview');
  /**
   * Function activates user and opens modal.
   *
   * @param user as Object or String representing user id.
   */
  px.userview.setActiveUser = function(user) {
    var callback = function(user) {
      px.userview.activeUser = user;
      px.userview.registerStateObject(px.userview.activeUser, 'activeUser');
      px.userview.activeLoadActions.loadUser = true;
      if (!px.userview.isOpen()) px.userview.dispatchEvent(px.userview.open);
    }

    if (typeof user == Object) {
      // Passed user object.
      callback(user);
    } else {
      var userId = user;
      // User id passed, need to fetch user object.
      px.api.request('GET', 'users/show', {id: user}, function(xhr) {
        user = JSON.parse(xhr.response).user;
        callback(user);
      }, function() { return user == userId });
    }
  };

  /**
   * Function acts as userview controller for Angular.js.
   */
  px.userview.controller = function($scope, $location) {
    px.userview.loadActions.loadUser = function(active, callback) {
      var user = px.userview.activeUser;
      // Get user photo.
      user.userpic_url = user.userpic_url.replace('/1.jpg', '/2.jpg');
      px.utility.getRemoteImage(user.userpic_url, function(url) {
        $scope.userpic_blob = url;
        $scope.$apply();
      });
      px.api.request('GET', 'users/show', {id: user.id}, function(xhr) {
        user = JSON.parse(xhr.response).user;

        $scope.id = user.id;
        $scope.user = user;
        $scope.about = px.utility.collapseString(user.about);
        $scope.location = user.city + ', ' + user.country;
        $scope.followMethod = user.following ? 'DELETE' : 'POST';
        $scope.followText = user.following ? 'Unfollow' : 'Follow';
        $scope.followSelected = user.following ? 'selected' : '';

        $scope.selectedFeature = 'user';
        $scope.changePhotoFeature();
        _.defer(px.userview.setIcon);

        $scope.$apply();
        callback();
      }, function() { return user.id == px.userview.activeUser.id });

      $scope.followUser = function() {
        px.api.request(
          $scope.followMethod,
          'users/' + $scope.id + '/friends',
          {},
          function(d) {
            user.following = !user.following;
            $scope.followMethod = user.following ? 'DELETE' : 'POST';
            $scope.followText = user.following ? 'Unfollow' : 'Follow';
            $scope.followSelected = user.following ? 'selected' : '';
            $scope.$apply();
        });
      }
    }

    px.userview.addEventListener('open', function() {
      if (!px.userview.activeUser || !$scope.user) return;
      var differentUser = px.userview.activeUser.id != $scope.user.id;
      if (px.page._pageResumeMode && differentUser) {
        px.userview.activeLoadActions.loadUser = true;
      }
    });

    // Set routes between angular apps.
    $scope.setRoute = function(app, route, options) {px.utility.setRoute(app, route, options)}

    // Set route in our app.
    px.userview.setRoute = function(route, alreadyActive) {
      var routeParts = route.split('/');
      if (!alreadyActive) px.userview.setActiveUser(routeParts[2]);
    }

    $scope.close = function() {px.userview.dispatchEvent(px.userview.close)};

    $scope.changePhotoFeature = function(style) {
      var list = '';
      var endpoint = 'photos';
      var params = {};
      switch ($scope.selectedFeature) {
        case 'user':
          list = 'user_' + $scope.id;
          break;
        case $scope.id.toString():
          list = 'user_' + $scope.id + '_flow';
          endpoint = 'activities/' + $scope.id;
          break;
        case 'user_favorites':
          list = 'user_' + $scope.id + '_favorites';
          params.sort = 'created_at';
          break;
        default: 
          list = 'user_' + $scope.id;
          break;
      }
      style = style || 'grid';
      params.feature = $scope.selectedFeature;
      params.user_id = $scope.id;
      if (style == 'grid') {
        px.userview.photolist = new Grid(
          list,
          endpoint,
          params,
          px.userview
        );
      } else if (style == 'flow') {
        px.userview.photolist = new Flow(
          list,
          endpoint,
          params,
          px.userview
        );
      }
    }
  }
});

