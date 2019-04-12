#!/usr/bin/env node
"use strict";

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _extends2 = require("babel-runtime/helpers/extends");

var _extends3 = _interopRequireDefault(_extends2);

var _yargs = require("yargs");

var _cosmiconfig = require("cosmiconfig");

var _cosmiconfig2 = _interopRequireDefault(_cosmiconfig);

var _Story2sketch = require("./Story2sketch");

var _Story2sketch2 = _interopRequireDefault(_Story2sketch);

var _findUp = require("find-up");

var _findUp2 = _interopRequireDefault(_findUp);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _chalk = require("chalk");

var _chalk2 = _interopRequireDefault(_chalk);

var _logoAscii = require("./logoAscii");

var _logoAscii2 = _interopRequireDefault(_logoAscii);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var tidyConfig = function tidyConfig(config) {
  var newConfig = (0, _extends3.default)({}, config);

  // Ensure paths are absolute, not relative
  if (newConfig.output && newConfig.output[0] !== "/") {
    newConfig.output = _path2.default.join(process.cwd(), newConfig.output);
  }

  if (newConfig.input && newConfig.input[0] !== "/") {
    newConfig.input = _path2.default.join(process.cwd(), newConfig.input);
  }

  // Convert input file to URL if defined
  if (newConfig.input) {
    newConfig.url = "file://" + newConfig.input;
  }

  return newConfig;
};

/* eslint-disable no-console */

var announce = function announce(config) {
  if (config.logo === "small") {
    console.log(_chalk2.default.blue.bold("💎  story2sketch"));
  } else {
    console.log(_chalk2.default.yellow.bold(_logoAscii2.default));
  }

  if (config.verbose) {
    console.log(_chalk2.default.gray(_chalk2.default.bold("Input URL:") + " " + config.url + "}"));
    console.log(_chalk2.default.gray(_chalk2.default.bold("Output File:") + " " + config.output + "\n"));
  }
};

var explorer = (0, _cosmiconfig2.default)("story2sketch");

explorer.load().then(function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(packageConfig) {
    var configPath, fileConfig, mergedConfig, story2sketch;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            configPath = _findUp2.default.sync("story2sketch.config.js");
            fileConfig = {};


            if (configPath) {
              fileConfig = require(configPath);
            }

            mergedConfig = tidyConfig((0, _extends3.default)({}, fileConfig, (packageConfig || { config: {} }).config, _yargs.argv));


            announce(mergedConfig);

            story2sketch = new _Story2sketch2.default(mergedConfig);
            _context.next = 8;
            return story2sketch.init();

          case 8:
            _context.next = 10;
            return story2sketch.execute();

          case 10:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function (_x) {
    return _ref.apply(this, arguments);
  };
}()).catch(function (parsingError) {
  throw parsingError;
});