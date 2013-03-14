console.log('px.home.js');

var px = px || {};
px.title = px.title || {} 

less = { async: true, fileAsync: true };

$(document).ready(function() {
  // Bootstrap angular modules.
  angular.bootstrap($('#feature'), ['px_feature']);
  angular.bootstrap($('#photoview'), ['px_photoview']);
  angular.bootstrap($('#userview'), ['px_userview']);

  jQuery.event.special.swipe.settings.threshold = .1;
  jQuery.event.special.swipe.settings.sensitivity = 100;

  $.get('assets/images/px.logo.svg', function(svgData) {
    $('#title .svg-wrapper').append(svgData);
    px.feature.dispatchEvent(px.feature.open);
  });

  // Postable links.
  $('section').delegate('a[data-method="POST"], a[data-method="DELETE"]', 'click', function() {
    // @TODO refactor so this works for every container.
    var button = $(this);
    var params = px.api.paramsToObject(button.attr('data-param'));
    px.api.request(button.attr('data-method'), button.attr('href'), params, function(d) {
      button.parent().addClass('selected');
    });
    px.photoview.setActivePhoto(px.photoview.activePhoto);
    return false;
  });

  $('#feature').delegate('[data-drawer="search"]', 'click', function(e) {
    var section = $(this).closest('body > section'),
        drawer = $('.' + $(this).attr('data-drawer'), section),
        input = $('input', drawer).select();
    input.attr('readonly', false);
    input.select();
  });

  $('body > section').delegate('.drawer', 'click', function(e) {
    e.stopPropagation();
  });

  $('#title').click(function() {
    var lastPage = _.last(px.page._pageHistory, 2) || [];
    if (lastPage.length == 2) {
      px.page._pageHistory.pop();
      lastPage = _.last(px.page._pageHistory);
      px[lastPage.identifier].resumeState(lastPage);
    }
  });

  $('#feature').delegate('.auth a', 'click', function() {
    // Reset auth button after ten seconds.
    var element = $('.auth a');
    setTimeout(function() {
      element.removeClass('selected');
    }, 10000);
  });

  px.title.setIcon = function() {
    if (px.page._pageHistory.length > 1) $('#title').addClass('back');
    else $('#title').removeClass('back');
  }

  $('body > section').delegate('.sidebar .options', 'click', function(e) {
    e.stopPropagation();
  });

  $('body > section').delegate('.mini.drawer', 'click', function(e) {
    return false;
  });

  $('body > section').delegate('.mini.drawer [target="_blank"]', 'click', function(e) {
    e.stopPropagation();
    return true;
  });

  $('body > section').delegate('.sidebar  [data-drawer]', 'click',
    _.debounce(function(e) {
      var button = $(this),
          section = button.closest('body > section'),
          options = button.closest('.options'),
          drawer = $('.drawer.' + button.attr('data-drawer'), section),
          mini = drawer.hasClass('mini'),
          open = drawer.hasClass('active');
      $('> *', options).removeClass('selected');
      px.utility.closeDrawers();
      if (!drawer.length) button.addClass('selected');

      // Photoview drawer control.
      if (drawer.length) {
        if (!open) {
          if (!mini) section.prepend('<div class="curtain" />');
          button.addClass('selected');
          drawer.addClass('active'); 
        }
      }

      // Single-case for feature/search.
      if (button.hasClass('search')) {
        var input = $('.search input', button);
        input.attr('readonly', true);
        input.blur();
        if (open) px.feature.setIcon();
      }
  }, 250, true));

  $('body > section').delegate('> .curtain', 'click', px.utility.closeDrawers);

  px.photoview.addEventListener('ready', function() {
    $('#photoview .sidebar .like.selected, #photoview .sidebar .favorite.selected').removeClass('selected');
    $('#photoview .comments textarea, #photoview .sendEmail textarea').each(function() {
      if (!$(this).hasClass('autogrow')) {
        $(this).autogrow();
        $(this).addClass('autogrow');
      }
    });
  });

  px.utility.setOfflineMode = _.throttle(function(mode) {
    console.log('HERE: setOfflineMode');
    if (!mode) $('body > .offline').hide();
    else $('body > .offline').show();
  }, 3000);
});

px.bgWindow.addEventListener('px_api_login', function() {
  $('body').removeClass('not-authenticated');
  $('body').addClass('authenticated');
});

px.bgWindow.addEventListener('px_api_logout', function() {
  $('body').removeClass('authenticated');
  $('body').addClass('not-authenticated');
});

px.photolist.attach = function(photolist) {
  var Page = photolist.Page;

  var element = $('.photolist-outer', Page.element);
  if (!element.length) {
    $(Page.element).append('<div ng-csp ng-view class="photolist-outer"></div>');
    element = $('.photolist-outer', Page.element);
  }

  var identifier = Page.identifier + '_list_' + photolist.active;
  photolist.module = angular.module(identifier, [])
    .config(function($routeProvider) {
      $routeProvider
        .otherwise({
          templateUrl: 'assets/templates/photolist.html',
          controller: photolist.controller
        })
    }).directive('pxPhotolist', function() {
      return {
        restrict: 'A',
        link: function(scope, element, attrs) {
          scope.$watch('photo', function() {
            var image = $('img', element);
            var imageObj = px.utility.getImageFromPhoto(
              scope.photo,
              photolist.imageSize
            );
            px.utility.getRemoteImage(imageObj.url, function(url) {
              photolist.attachNewElements(element);
              image.attr('src', url);
            });
          }, true);
        }
      };
  });
  var i = 0;
  angular.bootstrap(element, [identifier]);

  // Self-excuting assigned function.
  photolist.updateReady = (function() {
    var children = $('article', element);
    if (children.length) element.addClass('ready');
    else element.removeClass('ready');
    return arguments.callee;
  })();

  photolist._elementsToAttach = [];
  photolist._debouncedElementAttach = _.debounce(function() {
    var elements = $(photolist._elementsToAttach);
    elements.addClass('ready');
    elements.addClass('loaded');

    if (photolist.style == 'flow') {
      elements.attr('style', '');
      var getUnitWidth = function(units) {
        var height = photolist.listWidth(true);
        height *= units;
        return height;
      }
      var listWidth = photolist.listWidth(true) * photolist.listWidth();

      $('.inner', photolist.Page.element).width(listWidth);
      var elementArr = [];
      elements.each(function() {
        // Strictly reading the dom through this loop, no writes.
        var element = $(this),
            image = $('img', element),
            object = {};

        // Get height in units.
        var getElementHeight = function() {
          var elementClass = element.attr('class'),
              heightStr = 'height-',
              heightPos = elementClass.indexOf(heightStr);
          return elementClass.substr(heightPos + heightStr.length, 1);
        }
        // Get width in units.
        var getElementWidth = function() {
          var elementClass = element.attr('class'),
              widthStr = 'width-',
              widthPos = elementClass.indexOf(widthStr);
          return elementClass.substr(widthPos + widthStr.length, 1);
        }

        object.element = element;
        object.image = image;

        object.height = getUnitWidth(getElementHeight()) - 10;
        object.width = getUnitWidth(getElementWidth()) - 10;
        object.elementIsOdd2x1 = element.is($('._2x1').filter(':odd'));
        if (object.elementIsOdd2x1) {
          object.marginLeft = -getUnitWidth(2) + 5;
          object.marginTop = getUnitWidth(1) + 5;
        }
        object.imageRatio = image.attr('data-width') / image.attr('data-height');

        elementArr.push(object);
      });
      for (var i = 0; i < elementArr.length; i++) {
        // Strictly writing to the dom through this loop, no reads.
        var object = elementArr[i],
            elmntRatio = object.width / object.height,
            imageWidth = object.imageRatio > elmntRatio ? object.height * object.imageRatio : object.width,
            imageHeight = imageWidth / object.imageRatio;
        // Set the element height.
        object.element.height(object.height);
        object.element.width(object.width);

        // Special case for 2x1 blocks.
        if (object.elementIsOdd2x1) {
          object.element.css('margin-left', object.marginLeft);
          object.element.css('margin-top', object.marginTop);
        }

        // Resize the image to fit the box.
        object.image.width(imageWidth);
        object.image.height(imageHeight);

        object.image.css('top', -(imageHeight - object.height) / 2); 
        object.image.css('left', -(imageWidth - object.width) / 2); 
      }

    }
  }, 250);
  photolist.attachNewElements = function(element) {
    photolist._elementsToAttach.push(element[0]);
    photolist._debouncedElementAttach();
  }

  photolist.listWidth = function(pixels) {
    photolist._updateListWidth();
    if (pixels) return photolist._listPixelWidth;
    else return photolist._listWidth;
  }
  photolist._updateListWidth = _.throttle(function() {
    var width = element.width();
    var units = 2;
    if (width > 1599) units = 6;
    else if (width > 1199) units = 5;
    else if (width > 799) units = 4;
    else if (width > 499) units = 3;
    else units = 2;

    photolist._listWidth = units;
    photolist._listPixelWidth = (width - 120) / units;
  }, 250);

  Page.addEventListener('ready', function(e) {
    var pl = $('.photolist-outer .photolist', Page.element);
    if (photolist.style == 'grid') {
      $('.photolist .inner', Page.element).attr('style', '');
    }
  });

  var resize = _.debounce(function() {
    if (photolist.style == 'grid') {
      Page.dispatchEvent(photolist.resize);
    } else if (photolist.style == 'flow') {
      Page.dispatchEvent(photolist.redraw);
    }
  }, 250);

  $(window).resize(resize);

  /**
   * Infinite scrolling.
   */
  (function() {
    photolist.lastScrollPos = [];
    photolist.scrollReset = _.throttle(function() {
      var element = $('.photolist', Page.element).get()[0],
          inner = $('.inner', element).get()[0],
          bounds = {
            top: element.scrollTop,
            height: element.clientHeight,
            bottom: element.scrollTop + element.clientHeight
          },
          scrollOverflow = inner.clientHeight - bounds.bottom,
          elements = $('> article', inner).get(),
          badElements,buffer, scrollOffset = 0;

      // Get `scrollOffset` as average scroll distance over last three events.
      photolist.lastScrollPos.push(bounds.top);
      if (photolist.lastScrollPos.length > 3) photolist.lastScrollPos.shift();
      for (var index in photolist.lastScrollPos) {
        var list = photolist.lastScrollPos;
        var last = list[index + 1] || bounds.top;
        scrollOffset += (last - list[index])/list.length;
      }

      buffer = element.clientHeight + Math.abs(scrollOffset * 2),

      badElements = _.filter(elements, function(element) {
        // Remove elements that aren't in view.
        var offset = element.offsetTop,
            aboveScreen = offset + buffer < bounds.top,
            belowScreen = offset - buffer > bounds.bottom;

        return belowScreen || aboveScreen;
      });
      elements = _.difference(elements, badElements);

      // No read operations from here down (performance).
      $(elements).addClass('ready');
      $(badElements).removeClass('ready');

      // Load more.
      if (scrollOverflow < bounds.height * 2) {
        Page.activeLoadActions['loadMore'] = true;
        Page.dispatchEvent(Page.load);
      }

    }, 100);
    var scrollBound = false;
    var setPhotolistScroll = function() {
      if (!scrollBound) {
        var element = $('.photolist', Page.element);
        if (!element.length) return;
        element.unbind('scroll');
        element.bind('scroll', photolist.scrollReset);
        scrollBound = true;
      }
    }

    Page.addEventListener('ready', setPhotolistScroll);
    Page.addEventListener('open', setPhotolistScroll);

    Page.addEventListener('close', function(e) {
      element.unbind('scroll');
      scrollBound = false;
    });
  })();
};

/**
 * Next/prev photoview.
 */
(function() {
  window.onkeydown = function(e) {
    if (!$('#photoview').hasClass('ready')) return;
    if ($('#photoview .drawer').hasClass('active')) return;
    switch (e.keyIdentifier) {
      case 'Right':
        changeImage(1);
        break;
      case 'Left':
        changeImage(-1);
        break;
    }
  };
  
  var changeImage = _.throttle(function(increment) {
    if (typeof increment == 'object') increment = 0;
    var photo = px.photoview.photos[px.photoview.index + increment];
    if (!photo) {
      px.photoview.resize({type: 'slide'});
      return;
    }

    // Special case for flow.
    if (photo.items_total) photo = photo.items[0];

    if (typeof photo == 'undefined') return;

    px.photoview.setActivePhoto(photo);
    var element = $('#photoview [data-photo-id="' + photo.id + '"]').closest('.photo-container');

    px.photoview.resize({type: increment ? 'slide' : 'load'}, element, increment);
  }, 240);
  
  /**
   * Function resizes the photoview/slideshow.
   */
  px.photoview.resize = function(event, active, activeIncrement) {
    // Reading dom events.
    var pv = $('#photoview');
    var article = $('article', pv);
    var articleWidth = article.width();
    var active = active || $('.active', pv);
    var activeIncrement = activeIncrement || 0;
    var oldActive = $('.active', pv);
    var fullscreenMode = article.hasClass('fullscreen');
    var wrapperWidth = 0;
    var unreadyElements, readyElements = [];
    var setContainerWidths = function() {
      if (fullscreenMode) {
        $('.photo-container', pv).css('width', articleWidth);
        $('.photo-container', pv).css('max-width', '');
      } else {
        $('.photo-container', pv).css('max-width', articleWidth);
        $('.photo-container', pv).css('width', '');
      }
    };

    // Get `readyElements`.
    (function() {
      var neighbours = [-1, 0, 1];
      if (activeIncrement == 1) neighbours.unshift(-2);
      else if (activeIncrement == -1) neighbours.push(2);
      var photos = [];
      for (var i in neighbours) {
        var index = neighbours[i] + px.photoview.index;
        var value = px.photoview.photos[index];
        if (!value) continue;
        photos.push(value);
      }
      _.each(photos, function(photo, index) {
        var selector = '#photoview [data-photo-id="' + photo.id + '"]';
        var element = $(selector).closest('.photo-container')[0];
        if (element) readyElements.push(element);
      });
    })();
    if (!readyElements) return;
    readyElements = $(readyElements);
    unreadyElements = $('#photoview .ready').not(readyElements);

    event = event || {type: ''};

    if (px.photoview._swiping && event.type != 'slide') return;
    if (event.type != 'slide') px.photoview._swiping = true;

    if (event.type == 'load') _.defer(px.photoview.resizeDebounced);

    // This will force a re-calculation of styles, but we need the new widths
    // in this case.
    if (event.type == 'fullscreen') {
      if (fullscreenMode) article.removeClass('fullscreen');
      else article.addClass('fullscreen');
      articleWidth += 120;
      fullscreenMode = !fullscreenMode;
      setContainerWidths();
    }

    if (!active.length) return;

    var zero = (pv.width() / 2) + ((active.width() + 80) / 2) + 40;
    var searchDirection = 0;
    var searchItems = $('.photo-container', pv).get();
    var searchIndex = searchItems.indexOf(_.find(searchItems, function(p) {
      return p === active.get()[0];
    }));
    var initialIndex = searchIndex;
    var imageDistances = [];
    var searchDistance;

    if (!fullscreenMode) zero -= 100;

    searchDistance = zero;
    (function recurse() {
      var item = $(searchItems[searchIndex]);
      var changeDirection = function() {
        searchDirection = !searchDirection;        
        searchIndex = initialIndex + 1;
        searchDistance = zero;
        recurse();
      };
      var positionImage = function() {
        imageDistances.push({
          item: item,
          distance: searchDistance
        });
      }
      var width = item.width() + 80;
      if (searchDirection) {
        positionImage();
        searchDistance += width;
        searchIndex++;
        if (searchIndex < searchItems.length) recurse();
      } else {
        searchDistance -= width;
        positionImage();
        searchIndex--;
        if (searchIndex < 0) changeDirection();
        else recurse();
      }
    })();

    // Writing dom events.
    if (event.type != 'slide' && event.type != 'moveend') {
      $('.photo-wrapper', pv).addClass('no-transition');
    }

    if (event.type != 'fullscreen') setContainerWidths();

    if (active != oldActive) oldActive.removeClass('active');
    active.addClass('active');
    unreadyElements.removeClass('ready');
    readyElements.addClass('ready');

    for (var i in imageDistances) {
      var value = imageDistances[i];
      value.item.css('-webkit-transform', getTranslate(value.distance));
    }
    px.photoview._swiping = false;

    // Leave the `no-transition` class until the next frame.
    setTimeout(function() {
      $('.photo-wrapper', pv).removeClass('no-transition')
    }, 1);
  }

  px.photoview.resizeDebounced = _.debounce(changeImage, 250);

  $(window).resize(px.photoview.resize);
  var getTranslate = function(left) {
    if (typeof left == 'number') {
      return 'translate3d(' + left + 'px, 0, 0)';
    } else {
      return parseInt(left
        .replace('matrix(1, 0, 0, 1, ', '')
        .replace(', 0)', ''));
    }
  }

  $(document).ready(function() {
    var pv = $('#photoview');
    var itemPositions = [];
    pv.on('swipeleft swiperight', function(e) {
      if (!px.photoview._moving) return;
      px.photoview._moving = false;
      increment = e.type == 'swipeleft' ? 1 : -1;
      $('.photo-wrapper', pv).removeClass('no-transition');
      changeImage(increment);
    });
    pv.on('move', function(e) {
      for (var i in itemPositions) {
        var item = itemPositions[i].item;
        if (!item) return;
        var position = itemPositions[i].position += e.deltaX;
        item.css('-webkit-transform', getTranslate(position));
      }
    });
    pv.on('movestart', function(e) {
      $('.photo-wrapper', pv).addClass('no-transition');
      itemPositions = [];

      // Allows us to avoid read operations during the move event.
      $('.photo-container', pv).each(function() {
        var item = $(this);
        var position = getTranslate(item.css('-webkit-transform'));
        itemPositions.push({item: item, position: position});
      });
      px.photoview._swiping = true;
      px.photoview._moving = true;
    });
    pv.on('moveend', function(e) {
      if (!px.photoview._moving) return;
      $('.photo-wrapper', pv).removeClass('no-transition');
      // It's not clear if moveend is called before or after swipeleft/right,
      // we need to wait to make sure that this is.
      setTimeout(function(e) {
        px.photoview._moving = false;
        px.photoview._swiping = false;
        px.photoview.resize(e);
      }, 1, e);
    });
    $('#photoview').delegate('article', 'click', function(e) {
      var halfWidth = $(e.view).width() / 2;
      changeImage(e.clientX - halfWidth > 0 ? 1 : -1);
    });

    $('#photoview').delegate('.photo-wrapper .active, .photo-wrapper .fullscreen', 'click', function(e) {
      var pc = $('#photoview .active');
      var target = $('#photoview .article');
      if (target.hasClass('fullscreen')) {
        px.photoview.resize({type: 'fullscreen'});
      } else {
        px.photoview.resize({type: 'fullscreen'});
      }
      e.stopPropagation();
    });
  });
})();

px.title.actionHistory = [];

px.utility.closeDrawers = function(e) {
  if (!e) e = {};
  $('body > section [data-drawer]').each(function() {
    var section = $(this).closest('body > section'),
        button = $(this),
        drawer = $('.' + $(this).attr('data-drawer'), section);
    if (e.type == 'close') drawer.addClass('no-transition');
    $('> .curtain', section).remove();
    button.removeClass('selected');
    drawer.removeClass('active'); 
  });

  // Wait for a subsquent frame before adding the `no-transition` class back in.
  setTimeout(function() {
    $('body > section .drawer').removeClass('no-transition');
  }, 1);
}
px.photoview.addEventListener('close', px.utility.closeDrawers);

px.feature.closeSearchDrawer = function() {
  var button = $('#feature .options > .search'),
      input = $('input', button);
  px.utility.closeDrawers();
  button.addClass('selected');
  input.attr('readonly', true);
  input.blur();
}

px.title.hide = new CustomEvent('px_title_hide');

px.bgWindow.addEventListener('px_title_hide', function() {
  px.title.animationEnd();
});

px.feature.setIcon = function() {
  if (!px.feature.photolist.name) return;
  var activeMenu = px.feature.photolist.name.indexOf('search') == -1 ? px.feature.photolist.name : 'list_search';
  var selection = '#feature .' + activeMenu;
  var option = $(selection);
  $('#feature .options label').removeClass('selected');
  option.addClass('selected');
}
px.feature.addEventListener('open', px.feature.setIcon);
px.feature.addEventListener('ready', px.feature.setIcon);

px.userview.setIcon = function() {
  var selection = $('#userview .options input:checked');
  $('#userview .options label').removeClass('selected');
  selection.parent().addClass('selected');
}
px.userview.addEventListener('load', px.userview.setIcon);

px.feature.module = angular.module('px_feature', [])
  .config(function($routeProvider) {
    $routeProvider
      .otherwise({
        templateUrl: 'assets/templates/feature.html',
        controller: 'px.feature.controller'
      })
  });

px.photoview.module = angular.module('px_photoview', [])
  .config(function($routeProvider) {
    $routeProvider
      .otherwise({
        templateUrl: 'assets/templates/photoview.html',
        controller: 'px.photoview.controller'
      })
  }).directive('pxPhotoview', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        scope.$watch('photo', function() {
          if (scope.photo) {
            if (!element.attr('src')) {
              var imageObj = px.utility.getImageFromPhoto(scope.photo, px.photoview.imageSize);
              px.utility.getRemoteImage(imageObj.url, function(url) {
                element.attr('src', url);
                element.load(function(event) {
                  var ratio = element.width() / element.height() > $(window).width() / $(window).height();
                  element.addClass(ratio ? 'landscape' : 'portrait');

                  px.photoview.resizeDebounced(event);
                });
              });
            }
          }
        }, true);
      }
    };
  });

px.photoview.module = angular.module('px_userview', [])
  .config(function($routeProvider) {
    $routeProvider
      .otherwise({
        templateUrl: 'assets/templates/userview.html',
        controller: 'px.userview.controller'
      })
  });

