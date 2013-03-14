chrome.app.runtime.onLaunched.addListener(function() {
  px.feature = new Page('feature');
  px.feature.controller = function($scope) {
    $scope.logout = function() {
      if (px.api.isAuthenticated()) {
        window.dispatchEvent(px.api.logout);
        px.api.token = '';
        px.api.token_secret = '';
      }
    }
    $scope.login = function() {
      if (!px.api.isAuthenticated()) {
        px.api.authenticate();
      }
    }

    $scope.selectedFeature = 'popular';

    $scope.changePhotoFeature = function(style) {
      if ($scope.selectedFeature == 'search') return;
      style = style || 'grid';
      var endpoint;
      if ($scope.selectedFeature == 'friends') endpoint = 'activities/friends';
      else endpoint = 'photos';

      if (style == 'grid') {
        px.feature.photolist = new Grid(
          'list_' + $scope.selectedFeature,
          endpoint,
          {feature: $scope.selectedFeature},
          px.feature
        );
      } else if (style == 'flow') {
        px.feature.photolist = new Flow(
          'list_' + $scope.selectedFeature,
          'activities/friends',
          {feature: $scope.selectedFeature},
          px.feature
        );
      }
    }
    $scope.changePhotoFeature('grid');

    // Set routes between angular apps.
    $scope.setRoute = function(app, route, options) {px.utility.setRoute(app, route, options)}
    px.feature.setRoute = function(route, options) {
      $scope.selectedFeature = route;
      px.feature.dispatchEvent(px.feature.open);
      $scope.changePhotoFeature();
    }

    $scope.search = function() {
      var list = '';
      var endpoint = 'photos';
      if (!$scope.searchTerm) return;
      px.feature.closeSearchDrawer();
      px.feature.photolist = new Grid(
        'list_search_' + $scope.searchTerm,
        'photos/search',
        {term: $scope.searchTerm},
        px.feature
      );
    }
  }
});

