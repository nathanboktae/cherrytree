'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _invariant = require('./invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _qsLibUtils = require('qs/lib/utils');

var _pathToRegexp = require('path-to-regexp');

var _pathToRegexp2 = _interopRequireDefault(_pathToRegexp);

var paramInjectMatcher = /:([a-zA-Z_$][a-zA-Z0-9_$?]*[?+*]?)/g;
var specialParamChars = /[+*?]$/g;
var queryMatcher = /\?(.+)/;

var _compiledPatterns = {};

function compilePattern(pattern) {
  if (!(pattern in _compiledPatterns)) {
    var paramNames = [];
    var re = (0, _pathToRegexp2['default'])(pattern, paramNames);

    _compiledPatterns[pattern] = {
      matcher: re,
      paramNames: paramNames.map(function (p) {
        return p.name;
      })
    };
  }

  return _compiledPatterns[pattern];
}

var Path = {
  /**
   * Returns true if the given path is absolute.
   */
  isAbsolute: function isAbsolute(path) {
    return path.charAt(0) === '/';
  },

  /**
   * Joins two URL paths together.
   */
  join: function join(a, b) {
    return a.replace(/\/*$/, '/') + b;
  },

  /**
   * Returns an array of the names of all parameters in the given pattern.
   */
  extractParamNames: function extractParamNames(pattern) {
    return compilePattern(pattern).paramNames;
  },

  /**
   * Extracts the portions of the given URL path that match the given pattern
   * and returns an object of param name => value pairs. Returns null if the
   * pattern does not match the given path.
   */
  extractParams: function extractParams(pattern, path) {
    var cp = compilePattern(pattern);
    var matcher = cp.matcher;
    var paramNames = cp.paramNames;
    var match = path.match(matcher);

    if (!match) {
      return null;
    }

    var params = {};

    paramNames.forEach(function (paramName, index) {
      params[paramName] = match[index + 1];
    });

    return params;
  },

  /**
   * Returns a version of the given route path with params interpolated. Throws
   * if there is a dynamic segment of the route path for which there is no param.
   */
  injectParams: function injectParams(pattern, params) {
    params = params || {};

    return pattern.replace(paramInjectMatcher, function (match, param) {
      var paramName = param.replace(specialParamChars, '');

      // If param is optional don't check for existence
      if (param.slice(-1) === '?' || param.slice(-1) === '*') {
        if (params[paramName] == null) {
          return '';
        }
      } else {
        (0, _invariant2['default'])(params[paramName] != null, "Missing '%s' parameter for path '%s'", paramName, pattern);
      }

      return params[paramName];
    });
  },

  /**
   * Returns an object that is the result of parsing any query string contained
   * in the given path, null if the path contains no query string.
   */
  extractQuery: function extractQuery(path) {
    var match = path.match(queryMatcher);
    return match && _qs2['default'].parse(match[1]);
  },

  /**
   * Returns a version of the given path without the query string.
   */
  withoutQuery: function withoutQuery(path) {
    return path.replace(queryMatcher, '');
  },

  /**
   * Returns a version of the given path with the parameters in the given
   * query merged into the query string.
   */
  withQuery: function withQuery(path, query) {
    var existingQuery = Path.extractQuery(path);

    if (existingQuery) {
      query = query ? (0, _qsLibUtils.merge)(existingQuery, query) : existingQuery;
    }

    var queryString = _qs2['default'].stringify(query, { indices: false });

    if (queryString) {
      return Path.withoutQuery(path) + '?' + queryString;
    }

    return path;
  }
};

exports['default'] = Path;
module.exports = exports['default'];