const _ = require('lodash');
const async = require('async')
const request = require('request');
const crypto = require('crypto');

const RAFFLE_URL = "/prjdy/raffle";
const RANK_URL = "/prjdy/rank";
const CLICK_START_URL = "/prjdy/verify/clickStart";
const TRY_LOTTERY_URL = "/prjdy/verify/tryLottery";
const GET_SMS_CODE_URL = "/prjdy/login/getSmsCode";
const CHECK_LOGIN_URL = "/prjdy/login/check";
const LOGIN_URL = "/prjdy/login";


function Game(userInfo) {
    // 网站地址
    this._site = "http://gqft0.custom.24haowan.com";
    this._origin = "http://res.cdn.24haowan.com";
    this._refer = "http://res.cdn.24haowan.com/dingzhi/guangqifengtian/2st/v1/index.html";
    // 签名密钥
    this._secret = "PJpgAOPuHYLJZ3LA4M7tFIbZf4r8KW1wgjiaLjzFips";

    // 登陆口令
    this._jwt_token = null;
    this._sms_code = null;

    this._user_info = userInfo;
}

// 获取请求地址
Game.prototype.getUrl = function (path) {
    return this._site + path;
}

// 签名校验
Game.prototype.sign = function (params, time) {
    let paramStr = this.paramSort(params);
    let tmpStr = paramStr + time + this._secret;

    let sha1 = crypto.createHash("sha1");
    sha1.update(tmpStr);

    return sha1.digest('hex');
};

// 参数序列
Game.prototype.paramStringify = function (params) {
    let tmpList = [];
    for (let key in params) {
        if (params.hasOwnProperty(key)) {
            tmpList.push(key + "=" + encodeURIComponent(params[key]));
        }
    }

    return tmpList.join("&");
}

// 参数重排
Game.prototype.paramSort = function (params) {
    let paramStr = this.paramStringify(params);

    let list = paramStr.split("&");
    list.sort(function (prev, next) {
        if (prev > next) {
            return 1;
        } else if (prev === next) {
            return 0;
        } else {
            return -1;
        }
    });

    return list.join("&");
}

// 获取token
Game.prototype.getJwtToken = function () {
    if (!_.isString(this._jwt_token) || !this._jwt_token.length) {
        throw Error("please login first");
    }

    return "Bear " + this._jwt_token;
}

// 设置token
Game.prototype.setJwt = function (jwt) {
    this._jwt_token = jwt;
}

// 获取请求头
Game.prototype.getHeader = function (params, isLogin) {
    let now = Math.round(new Date().getTime() / 1000);
    let sign = this.sign(params, now);

    let headers = {
        "X-SIG": sign,
        "X-TIME": now
    };
    if (isLogin) {
        headers["Authorization"] = this.getJwtToken();
    }

    return headers;
}

// post请求
Game.prototype.post = function (url, params, isLogin, cb) {
    let headers = {
        "Origin": this._origin,
        "Referer": this._refer
    };
    Object.assign(headers, this.getHeader(params, isLogin));

    url = this.getUrl(url);
    request({
        url: url,
        method: "POST",
        form: params,
        headers: headers
    }, function (error, response, body) {
        if (error) {
            cb(error);
        } else {
            try {
                body = JSON.parse(body);
            } catch (e) {
                return cb("json parse error");
            }
            if (response.statusCode === 200) {
                cb(null, body);
            } else {
                cb(body.msg || "status_code: " + response.statusCode);
            }
        }
    });
}

// option请求
Game.prototype.options = function (url, method, isLogin, cb) {
    let headers = {
        "Access-Control-Request-Headers": isLogin ? "authorization,x-sig,x-time" : "x-sig,x-time",
        "Access-Control-Request-Method": method,
        "Origin": this._origin,
        "Referer": this._refer
    } 

    url = this.getUrl(url);
    request({
        url: url,
        method: "OPTIONS",
        headers: headers
    }, function (error, response, body) {
        if (error) {
            cb(error);
        } else {
            if (response.statusCode === 204 || response.statusCode === 200) {
                cb(null);
            } else {
                cb(body || "status_code: " + response.statusCode);
            }
        }
    });
};

// 请求操作
Game.prototype.action = function (url, data, isLogin, cb) {
    let self = this;
    async.waterfall([
        function (callback) {
            self.options(url, "POST", isLogin, function (err) {
                callback(err);
            });
        },
        function (callback) {
            self.post(url, data, isLogin, function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    if (result.code == 0) {
                        callback(null, result);
                    } else {
                        callback(result.msg || "unexpected error");
                    }
                }
            });
        }
    ], function (err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    });
}

// 点击开始
Game.prototype.clickStart = function (cb) {
    this.action(CLICK_START_URL, {}, true, function (err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    });
}

// 设置排行
Game.prototype.setRank = function (cb) {
    let data = {};
    let name = this._user_info.dealer_name;
    for (let i = 0; i < name.length; i++) {
        data[i] = name[i];
    }

    this.action(RANK_URL, data, true, function (err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    });
}

// 抽奖
Game.prototype.raffle = function (cb) {
    this.action(RAFFLE_URL, {}, true, function (err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    });
}

// 校验抽奖
Game.prototype.tryLottery = function (cb) {
    this.action(TRY_LOTTERY_URL, {}, true, function (err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    });
}

// 获取验证码
Game.prototype.getSmsCode = function (cb) {
    let reg = new RegExp(/\d{11}/);
    if (!_.isString(this._user_info.phone) || !this._user_info.phone.length || !reg.test(this._user_info.phone)) {
        throw Error("invalid phone");
    }

    let data = {
        "phone": this._user_info.phone
    }
    this.action(GET_SMS_CODE_URL, data, false, function (err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    });
};

// 登陆校验
Game.prototype.checkLogin = function (smsCode, cb) {
    let reg = new RegExp(/\d{11}/);
    if (!_.isString(this._user_info.phone) || !this._user_info.phone.length || !reg.test(this._user_info.phone)) {
        throw Error("invalid phone");
    }
    if (!_.isString(smsCode) || !smsCode.length) {
        throw Error("invalid sms code");
    }

    let data = {
        "phone": this._user_info.phone,
        "sms_code": smsCode,
    }
    this.action(CHECK_LOGIN_URL, data, false, function (err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    });
}

// 登陆
Game.prototype.login = function (smsCode, cb) {
    let reg = new RegExp(/\d{11}/);
    if (!_.isString(this._user_info.phone) || !this._user_info.phone.length || !reg.test(this._user_info.phone)) {
        throw Error("invalid phone");
    }
    if (!_.isString(smsCode) || !smsCode.length) {
        throw Error("invalid sms code");
    }
    if (!_.isString(this._user_info.customer_name) || !this._user_info.customer_name.length) {
        throw Error("invalid customer name");
    }
    if (!_.isString(this._user_info.modle_name) || !this._user_info.modle_name.length) {
        throw Error("invalid modle name");
    }
    if (!_.isString(this._user_info.modle_code) || !this._user_info.modle_code.length) {
        throw Error("invalid modle code");
    }
    if (!_.isString(this._user_info.province_name) || !this._user_info.province_name.length) {
        throw Error("invalid province name");
    }
    if (!_.isString(this._user_info.province_code) || !this._user_info.province_code.length) {
        throw Error("invalid province code");
    }


    if (!_.isString(this._user_info.city_name) || !this._user_info.city_name.length) {
        throw Error("invalid city name");
    }
    if (!_.isString(this._user_info.city_code) || !this._user_info.city_code.length) {
        throw Error("invalid city code");
    }
    if (!_.isString(this._user_info.dealer_name) || !this._user_info.dealer_name.length) {
        throw Error("invalid dealer name");
    }
    if (!_.isString(this._user_info.dealer_code) || !this._user_info.dealer_code.length) {
        throw Error("invalid dealer code");
    }

    let data = {
        customer_name: this._user_info.customer_name,
        phone: this._user_info.phone,
        sms_code: smsCode,
        modle_name: this._user_info.modle_name,
        modle_code: this._user_info.modle_code,
        province_name: this._user_info.province_name,
        province_code: this._user_info.province_code,
        city_name: this._user_info.city_name,
        city_code: this._user_info.city_code,
        dealer_name: this._user_info.dealer_name,
        dealer_code: this._user_info.dealer_code
    }
    this.action(LOGIN_URL, data, false, function (err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    });
}


module.exports = Game;