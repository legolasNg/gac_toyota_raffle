# 广汽丰田抽奖模拟

## 活动说明

广汽丰田的购车活动，在购车三个月内可以无限次抽奖。

## 活动地址

[http://res.cdn.24haowan.com/dingzhi/guangqifengtian/2st/v1/index.html](http://res.cdn.24haowan.com/dingzhi/guangqifengtian/2st/v1/index.html)

## 程序说明

该程序只是模拟请求向服务器发送抽奖请求，不存在作弊和泄漏隐私等操作。

## 程序依赖

先安装`node`和`npm`，然后使用`npm`安装`package.json`中的依赖:

```shell
git clone https://github.com/legolasNg/gac_toyota_raffle.git

cd gac_toyota_raffle

npm install
```

## 操作流程

- 1.查看`/resource`目录下的城市编号、汽车编号和销售点编号。

- 2.根据上一步的信息，配置`/settings.js`中的个人信息( **如果已经注册过，则只需要填写手机号码** )。

- 3.运行程序`node app.js`。

- 4.程序运行之后，会向手机发送短信( 如果登陆尝试过于频繁后报错，请在2分钟后再重试 )，根据短信填写验证码，按回车键继续。

## 声明

本程序不能用于盈利目的，如果侵权立马删除。
