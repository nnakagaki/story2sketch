"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-console */

var qler = require("qler");

var PagePool = function () {
  function PagePool(browser, numPages) {
    (0, _classCallCheck3.default)(this, PagePool);

    this.numPages = numPages;
    this.browser = browser;

    this.freePages = [];
    this.qler = qler(numPages);

    this.fns = [];
    this.numExecuted = 0;
  }

  (0, _createClass3.default)(PagePool, [{
    key: "init",
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
        var i;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                i = 0;

              case 1:
                if (!(i < this.numPages)) {
                  _context.next = 10;
                  break;
                }

                _context.t0 = this.freePages;
                _context.next = 5;
                return this.browser.newPage();

              case 5:
                _context.t1 = _context.sent;

                _context.t0.push.call(_context.t0, _context.t1);

              case 7:
                i++;
                _context.next = 1;
                break;

              case 10:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function init() {
        return _ref.apply(this, arguments);
      }

      return init;
    }()
  }, {
    key: "finishCheck",
    value: function finishCheck() {
      this.numExecuted += 1;

      return this.numExecuted === this.fns.length;
    }
  }, {
    key: "queue",
    value: function queue(fn) {
      var _this = this;

      this.fns.push(function () {
        var page = _this.freePages[0];

        _this.freePages.splice(0, 1);

        return fn(page).then(function () {
          _this.freePages.push(page);
        }).catch(function (error) {
          console.error(error);
        });
      });
    }
  }, {
    key: "execute",
    value: function execute() {
      var _this2 = this;

      return new _promise2.default(function (resolve) {
        var _loop = function _loop(i) {
          var fn = _this2.fns[i];

          _this2.qler.queue(function (releaseQueue) {
            fn().then(function () {
              releaseQueue();

              if (_this2.finishCheck()) {
                resolve();
              }
            }).catch(function (error) {
              console.error(error);
            });
          });
        };

        for (var i = 0; i < _this2.fns.length; i++) {
          _loop(i);
        }
      });
    }
  }, {
    key: "reset",
    value: function reset() {
      this.numExecuted = 0;
      this.fns = [];
    }
  }]);
  return PagePool;
}();

exports.default = PagePool;