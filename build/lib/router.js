'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = cherrytree;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _dash = require('./dash');

var _dsl = require('./dsl');

var _dsl2 = _interopRequireDefault(_dsl);

var _path = require('./path');

var _path2 = _interopRequireDefault(_path);

var _invariant = require('./invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _locationsHistory = require('./locations/history');

var _locationsHistory2 = _interopRequireDefault(_locationsHistory);

var _locationsMemory = require('./locations/memory');

var _locationsMemory2 = _interopRequireDefault(_locationsMemory);

var _transition = require('./transition');

var _transition2 = _interopRequireDefault(_transition);

var _links = require('./links');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

function Cherrytree() {
  this.initialize.apply(this, arguments);
}

/**
 * The actual constructor
 * @param {Object} options
 */
Cherrytree.prototype.initialize = function (options) {
  this.nextId = 1;
  this.state = {};
  this.middleware = [];
  this.options = (0, _dash.extend)({
    interceptLinks: true,
    logError: true,
    Promise: global.Promise
  }, options);
  this.log = (0, _logger2['default'])(this.options.log);
  this.logError = (0, _logger2['default'])(this.options.logError, { error: true });

  (0, _invariant2['default'])(typeof this.options.Promise === 'function', 'Cherrytree requires an ES6 Promise implementation, ' + 'either as an explicit option or a global Promise');
};

/**
 * Add a middleware
 * @param  {Function} middleware
 * @return {Object}   router
 * @api public
 */
Cherrytree.prototype.use = function (middleware) {
  this.middleware.push(middleware);
  return this;
};

/**
 * Add the route map
 * @param  {Function} routes
 * @return {Object}   router
 * @api public
 */
Cherrytree.prototype.map = function (routes) {
  // create the route tree
  this.routes = (0, _dsl2['default'])(routes);

  // create the matcher list, which is like a flattened
  // list of routes = a list of all branches of the route tree
  var matchers = this.matchers = [];

  eachBranch({ routes: this.routes }, [], function (routes) {
    // concatenate the paths of the list of routes
    var path = routes.reduce(function (memo, r) {
      // reset if there's a leading slash, otherwise concat
      // and keep resetting the trailing slash
      return (r.path[0] === '/' ? r.path : memo + '/' + r.path).replace(/\/$/, '');
    }, '');
    // ensure we have a leading slash
    if (path === '') {
      path = '/';
    }
    // register routes
    matchers.push({
      routes: routes,
      name: routes[routes.length - 1].name,
      path: path
    });
  });

  function eachBranch(node, memo, fn) {
    node.routes.forEach(function (route) {
      if (!route.options || route.options.abstract !== true) {
        fn(memo.concat(route));
      }
      if (route.routes && route.routes.length > 0) {
        eachBranch(route, memo.concat(route), fn);
      }
    });
  }

  return this;
};

/**
 * Starts listening to the location changes.
 * @param  {Object}  location (optional)
 * @return {Promise} initial transition
 *
 * @api public
 */
Cherrytree.prototype.listen = function (location) {
  var _this = this;

  location = this.location = location || this.createDefaultLocation();
  // setup the location onChange handler
  location.onChange(function (url) {
    return _this.dispatch(url);
  });
  // start intercepting links
  if (this.options.interceptLinks && location.usesPushState()) {
    this.interceptLinks();
  }
  // and also kick off the initial transition
  return this.dispatch(location.getURL());
};

/**
 * Transition to a different route. Passe in url or a route name followed by params and query
 * @param  {String} url     url or route name
 * @param  {Object} params  Optional
 * @param  {Object} query   Optional
 * @return {Object}         transition
 *
 * @api public
 */
Cherrytree.prototype.transitionTo = function () {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  if (this.state.activeTransition) {
    return this.replaceWith.apply(this, args);
  }
  return this.doTransition('setURL', args);
};

/**
 * Like transitionTo, but doesn't leave an entry in the browser's history,
 * so clicking back will skip this route
 * @param  {String} url     url or route name followed by params and query
 * @param  {Object} params  Optional
 * @param  {Object} query   Optional
 * @return {Object}         transition
 *
 * @api public
 */
Cherrytree.prototype.replaceWith = function () {
  for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  return this.doTransition('replaceURL', args);
};

/**
 * Create an href
 * @param  {String} name   target route name
 * @param  {Object} params
 * @param  {Object} query
 * @return {String}        href
 *
 * @api public
 */
Cherrytree.prototype.generate = function (name, params, query) {
  (0, _invariant2['default'])(this.location, 'call .listen() before using .generate()');
  var matcher = undefined;

  params = params || {};
  query = query || {};

  this.matchers.forEach(function (m) {
    if (m.name === name) {
      matcher = m;
    }
  });

  if (!matcher) {
    throw new Error('No route is named ' + name);
  }

  // this might be a dangerous feature, although it's useful in practise
  // if some params are not passed into the generate call, they're populated
  // based on the current state or on the currently active transition.
  // Consider removing this.. since the users can opt into this behaviour, by
  // reaching out to the router.state if that's what they want.
  var currentParams = (0, _dash.clone)(this.state.params || {});
  if (this.state.activeTransition) {
    currentParams = (0, _dash.clone)(this.state.activeTransition.params || {});
  }
  params = (0, _dash.extend)(currentParams, params);

  var url = _path2['default'].withQuery(_path2['default'].injectParams(matcher.path, params), query);
  return this.location.formatURL(url);
};

/**
 * Stop listening to URL changes
 * @api public
 */
Cherrytree.prototype.destroy = function () {
  if (this.location && this.location.destroy && this.location.destroy) {
    this.location.destroy();
  }
  if (this.disposeIntercept) {
    this.disposeIntercept();
  }
  if (this.state.activeTransition) {
    this.state.activeTransition.cancel();
  }
  this.state = {};
};

/**
  Resets the state of the router by clearing the current route
  handlers and deactivating them.

  @api public
 */
Cherrytree.prototype.reset = function () {};

/**
 * @api private
 */
Cherrytree.prototype.doTransition = function (method, params) {
  var _this2 = this;

  var previousUrl = this.location.getURL();

  var url = params[0];
  if (url[0] !== '/') {
    url = this.generate.apply(this, params);
    url = url.replace(/^#/, '/');
  }

  if (this.options.pushState) {
    url = this.location.removeRoot(url);
  }

  var transition = this.dispatch(url);

  transition['catch'](function (err) {
    if (err && err.type === 'TransitionCancelled') {
      // reset the URL in case the transition has been cancelled
      _this2.location.replaceURL(previousUrl, { trigger: false });
    }
    return err;
  });

  this.location[method](url, { trigger: false });

  return transition;
};

/**
 * Match the path against the routes
 * @param  {String} path
 * @return {Object} the list of matching routes and params
 *
 * @api private
 */
Cherrytree.prototype.match = function (path) {
  path = (path || '').replace(/\/$/, '') || '/';
  var found = false;
  var params = undefined;
  var query = undefined;
  var routes = [];
  var pathWithoutQuery = _path2['default'].withoutQuery(path);
  this.matchers.forEach(function (matcher) {
    if (!found) {
      params = _path2['default'].extractParams(matcher.path, pathWithoutQuery);
      if (params) {
        found = true;
        routes = matcher.routes;
        query = _path2['default'].extractQuery(path) || {};
      }
    }
  });
  return {
    routes: routes.map(descriptor),
    params: params || {},
    query: query || {}
  };

  // clone the data (only a shallow clone of options)
  // to make sure the internal route store is not mutated
  // by the middleware. The middleware can mutate data
  // before it gets passed into the next middleware, but
  // only within the same transition. New transitions
  // will get to use pristine data.
  function descriptor(route) {
    return {
      name: route.name,
      path: route.path,
      params: (0, _dash.pick)(params, _path2['default'].extractParamNames(route.path)),
      options: (0, _dash.clone)(route.options)
    };
  }
};

Cherrytree.prototype.dispatch = function (path) {
  var match = this.match(path);
  var query = match.query;
  var pathname = _path2['default'].withoutQuery(path);

  var activeTransition = this.state.activeTransition;

  // if we already have an active transition with all the same
  // params - return that and don't do anything else
  if (activeTransition && activeTransition.pathname === pathname && (0, _dash.isEqual)(activeTransition.query, query)) {
    return activeTransition;
  }

  // otherwise, cancel the active transition since we're
  // redirecting (or initiating a brand new transition)
  if (activeTransition) {
    var err = new Error('TransitionRedirected');
    err.type = 'TransitionRedirected';
    err.nextPath = path;
    activeTransition.cancel(err);
  }

  // if there is no active transition, check if
  // this is a noop transition, in which case, return
  // a transition to respect the function signature,
  // but don't actually run any of the middleware
  if (!activeTransition) {
    if (this.state.pathname === pathname && (0, _dash.isEqual)(this.state.query, query)) {
      return (0, _transition2['default'])({
        id: this.nextId++,
        path: path,
        match: match,
        noop: true,
        router: this
      }, this.options.Promise);
    }
  }

  var t = (0, _transition2['default'])({
    id: this.nextId++,
    path: path,
    match: match,
    router: this
  }, this.options.Promise);

  this.state.activeTransition = t;

  return t;
};

/**
 * Create the default location.
 * This is used when no custom location is passed to
 * the listen call.
 * @return {Object} location
 *
 * @api private
 */
Cherrytree.prototype.createDefaultLocation = function () {
  var locationOptions = (0, _dash.pick)(this.options, ['pushState', 'root', 'location', 'history']);
  return new _locationsHistory2['default'](locationOptions);
};

/**
 * When using pushState, it's important to setup link interception
 * because all link clicks should be handled via the router instead of
 * browser reloading the page
 */
Cherrytree.prototype.interceptLinks = function () {
  var _this3 = this;

  this.disposeIntercept = (0, _links.intercept)(function (e, link) {
    e.preventDefault();
    // TODO use router.transitionTo instead, because
    // that way we're handling errors and what not? and don't
    // update url on failed requests or smth?
    _this3.transitionTo(_this3.location.removeRoot(link.getAttribute('href')));
  });
};

function cherrytree(options) {
  return new Cherrytree(options);
}

/**
 * Attach the locations implentations for easy access
 */

cherrytree.HistoryLocation = _locationsHistory2['default'];
cherrytree.MemoryLocation = _locationsMemory2['default'];
module.exports = exports['default'];