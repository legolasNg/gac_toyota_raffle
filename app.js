const _ = require('lodash');
const async = require('async');
const readline = require('readline');
const Game = require('./models/game');
const settings = require('./settings');

const userInfo = settings.user_info;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function App(info) {
    this._retry_limit = 3;
    this._game_model = null;
    this._sms_code = null;
}

App.prototype.start = function (info) {
    if (!_.isPlainObject(info) || !_.isString(info.phone)) {
        throw Error("invalid user info");
    }
    this._game_model = new Game(info);

    // 先登陆
    let self = this;
    self.login(function (err) {
        if (err) throw _.isString(err) ? Error(err) : err;

        // 登陆成功之后，开始模拟请求
        console.log("login successfully");
        let round = 0;
        async.forever(function (next) {
            self.fishing(function (err, result) {
                round++;
                console.info("round: " + round);
                if (err) {
                    next(err);
                } else {
                    console.log(result);
                    next(null);
                }
            });
        }, function (err) {
            if (err) {
                console.error(err);
            }
        });
    })
}

// 登陆
App.prototype.login = function (cb) {
    let self = this;
    async.waterfall([
        // 发送邀请码
        function (callback) {
            self._game_model.getSmsCode(function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    callback(null);
                }
            });
        },
        // 输入验证码
        function (callback) {
            async.retry(3, function (next) {
                rl.question("please input sms code:", function (answer) {
                    let reg = new RegExp(/\d{6}/);
                    if (!reg.test(answer)) {
                        return next("invalid sms code");
                    }

                    next(null, answer);
                });
            }, function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    self._sms_code = result;
                    callback(null);
                }
            });
        },
        // 校验登陆(如果注册过会自动登陆)
        function (callback) {
            self._game_model.checkLogin(self._sms_code, function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    let jwt = null;
                    if (result && result.code === 0 && result.payload && result.payload.jwt) {
                        jwt = result.payload.jwt;
                    }
                    callback(null, jwt);
                }
            });
        },
        // 如果没有注册，则登陆
        function (jwt, callback) {
            if (_.isString(jwt) && jwt.length) {
                self._game_model.setJwt(jwt);
                return callback(null);
            }

            self._game_model.login(self._sms_code, function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    if (result && result.code === 0 && result.payload && result.payload.jwt) {
                        self._game_model.setJwt(result.payload.jwt);
                        callback(null, result.payload.jwt);
                    } else {
                        callback(errorresult.code !== 0 ? result.msg : "login failed");
                    }
                }
            });
        }
    ], function (err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null);
        }
    });
}

// 钓鱼
App.prototype.fishing = function (cb) {
    let reward = {
        msg: "fail",
        result: null,
        lottery: null
    };
    let self = this;
    async.waterfall([
        function (callback) {
            self._game_model.clickStart(function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    reward.result = result;
                    if (result && result.payload && result.payload.hit) {
                        reward.msg = "success";
                    }
                    callback(null);
                }
            });
        },
        function (callback) {
            self._game_model.rank(function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    callback(null);
                }
            });
        },
        function (callback) {
            self._game_model.raffle(function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    callback(null);
                }
            });
        },
        function (callback) {
            self._game_model.tryLottery(function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    reward.lottery = result;
                    callback(null);
                }
            });
        }
    ], function (err) {
        if (err) {
            cb(err);
        } else {
            cb(null, reward);
        }
    });
};


// 运行
let app = new App();
app.start(userInfo);