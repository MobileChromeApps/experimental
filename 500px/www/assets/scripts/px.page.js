px.page = {};
px.page._pages = [];
px.page._pageHistory = [];
px.page._pageResumeMode = false;
var Page = Class.extend({
  init: function(identifier) {
    console.log('init');
    var Page = this;

    px.page._pages.push(this);

    this.identifier = identifier;

    // Internal event handling.
    this._events = {};
    /**
     * Function lists all events of a given type.
     * @param type as String.
     * @return Array.
     */
    this.getListeners = function(type) {
      return this._events[type];
    };
    /**
     * Function creates a new event type.
     * @param type as String.
     */
    this.CustomEvent = function(type) {
      Page._events[type] = Page._events[type] || [];
      this.type = type;
      this.cancelable = false;
      this.defaultPrevented = false;
      this.preventDefault = function() {
        if (this.cancelable) this.defaultPrevented = true;
      }
    }
    /**
     * Function adds a new listener to a given event type.
     * @param type as String.
     * @param listener as Function.
     */
    this.addEventListener = function(type, listener) {
      if (!this._events[type]) this.CustomEvent(type);
      this._events[type].push(listener);
    };
    /**
     * Function removes a given event listener from a given event type.
     * @param type as String.
     * @param listener as Function.
     */
    this.removeEventListener = function(type, listener) {
      var index = this._events[type].indexOf(listener);
      this._events[type].splice(index, 1);
    }
    /**
     * Function dispatches a given event and type.
     * @param type as String.
     * @param event to be passed as a paramater to each listener.
     */
    this.dispatchEvent = function(event) {
      event.defaultPrevented = false;
      for (var i in this._events[event.type]) {
        this._events[event.type][i](event);
        if (event.defaultPrevented) return;
      }
    }

    this.open = new this.CustomEvent('open');
    this.open.cancelable = true;
    this.load = new this.CustomEvent('load');
    this.ready = new this.CustomEvent('ready');
    this.ready.cancelable = true;
    this.close = new this.CustomEvent('close');

    this.loadActions = {};
    this.activeLoadActions = {};

    this.addEventListener('close', function() {
      if (px.title) px.title.setIcon();
    });

    this.addEventListener('open', function() {
      if (px.page._pageResumeMode) {
        _.defer(function() { px.page._pageResumeMode = false });
      }
    });
    this.stateObjects = {};
    /*
     * Function defines state-specific values for this page.
     */
    this.registerStateObject = function(obj, identifier) {
      this.stateObjects[identifier] = obj;
    }

    this.resumeState = function(obj) {
      px.page._pageResumeMode = true;
      for (var identifier in this.stateObjects) {
        this[identifier] = obj.stateObjects[identifier];
      }
      this.dispatchEvent(this.open);
    }

    this.isOpen = function() {
      var lastPage = _.last(px.page._pageHistory);
      if (lastPage) return lastPage.identifier == identifier;
      else return false; 
    }

    this.addEventListener('open', function(e) {
      var lastPage = _.last(px.page._pageHistory);
      if (!lastPage || lastPage.identifier != identifier) {
        var clone = {};
        for (i in Page) {
          if (typeof Page[i] == 'object') clone[i] = _.clone(Page[i]);
          else clone[i] = Page[i];
        }
        px.page._pageHistory.push(clone);
      }

      // Once all open events have completed, move onto load events.
      _.defer(function() {
        if (!e.defaultPrevented) Page.dispatchEvent(Page.load);
      });
    });

    // Event listener for the load event that completes all load actions.
    this.addEventListener('load', function(e) {
      var loadActionCount = _.size(Page.activeLoadActions);
      var ready = function() {
        if (!loadActionCount) _.defer(function() {Page.dispatchEvent(Page.ready)});
      }

      for (var action in Page.activeLoadActions) {
        if (!Page.loadActions[action]) return;
        // Pass value of active load action to it's corrosponding load action.
        Page.loadActions[action](Page.activeLoadActions[action], function() {
          loadActionCount--;
          ready();
        });
        delete Page.activeLoadActions[action];
      }
      ready();
    });

    // Event listener closes other pages when open state is thrown.
    this.addEventListener('open', function() {
      // Close all other pages.
      for (var i in px.page._pages) {
        var page = px.page._pages[i];
        if (page == Page) continue;
        page.dispatchEvent(page.close);
      }
    });

    // Background window will recieve event indicating launch of index window.
    window.addEventListener('px_index_launch', function() {
      // Index window will revieve event indicating load completion.
      px.index.window.addEventListener('load', function() {
        var $ = px.index.window.$;
        var element = $(px.index.window.document.getElementById(identifier));
        Page.element = element.get();
        element.addClass(' px_utility_page');

        // @TODO This animation-y stuff should be done from px.home.
        var toggleEventState = function(e) {
          if (e.type != 'close') {
            if (!element.hasClass(e.type)) {
              element.addClass(e.type);
              if (e.type == 'open') {
                // Animate.
                if (px.page._pageResumeMode) {
                  element.addClass('moveLeftToCenter');
                  setTimeout(function() {
                    element.removeClass('moveLeftToCenter')
                  },600);
                } else {
                  element.addClass('moveRightToCenter');
                  setTimeout(function() {
                    element.removeClass('moveRightToCenter')
                  },600);
                }
              }
            }
          } else {
            if (element.hasClass('open')) {
              if (px.page._pageResumeMode) {
                // Animate.
                element.addClass('moveCenterToLeft');
                setTimeout(function() {
                  element.removeClass('moveCenterToLeft')
                },600);
              } else {
                element.addClass('moveCenterToRight');
                setTimeout(function() {
                  element.removeClass('moveCenterToRight')
                },600);
              }
            }
            // Remove all event classNames.
            for (var eventType in Page._events) element.removeClass(eventType);
          }
        }
        for (var eventType in Page._events) {
          Page.addEventListener(eventType, toggleEventState);
        }

        this.addEventListener('open', function() {
          px.title.setIcon();
        });
      });
    });  
  }
});

