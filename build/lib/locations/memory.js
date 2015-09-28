'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _dash = require('../dash');

exports['default'] = MemoryLocation;

function MemoryLocation(path) {
  this.path = path || '';
}

MemoryLocation.prototype.getURL = function () {
  return this.path;
};

MemoryLocation.prototype.setURL = function (path, options) {
  if (this.path !== path) {
    this.path = path;
    this.handleURL(this.getURL(), options);
  }
};

MemoryLocation.prototype.replaceURL = function (path, options) {
  if (this.path !== path) {
    this.setURL(path, options);
  }
};

MemoryLocation.prototype.onChange = function (callback) {
  this.changeCallback = callback;
};

MemoryLocation.prototype.handleURL = function (url, options) {
  this.path = url;
  options = (0, _dash.extend)({ trigger: true }, options);
  if (this.changeCallback && options.trigger) {
    this.changeCallback(url);
  }
};

MemoryLocation.prototype.usesPushState = function () {
  return false;
};

MemoryLocation.prototype.removeRoot = function (url) {
  return url;
};

MemoryLocation.prototype.formatURL = function (url) {
  return url;
};
module.exports = exports['default'];