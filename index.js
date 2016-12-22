'use strict'
var request = require('request-promise'),
  cheerio = require('cheerio'),
  iconv = require('iconv-lite'),
  nodemailer = require('nodemailer'),
  config = require('./config.js'),
  keyword = config.keyword;

function getOptions(url) {
  return {
    uri: url,
    encoding: null,
    transform: function (body) {
      body = iconv.decode(body, 'gb2312');
      return cheerio.load(body)
    }
  }
}

var transporter = nodemailer.createTransport({
  service: 'qq',
  secureConnection: true, // 使用 SSL
  auth: {
    user: config.user,
    pass: config.pass
  }
});

var mailOptions = {
  from: config.user, // 发件地址
  to: config.to, // 收件列表
  subject: `${new Date().getMonth()}月${new Date().getDay()}日最新照片信息`, // 标题
  // html: '<b>Hello world ?</b>'
};

var options = getOptions(config.url)

request(options)
  .then($ => {
    var items = $('item');
    var titles = [];
    var itemsByKeyword = items.filter((i, item) => {
      return $(item).find('title').text().indexOf(keyword) > -1
      // let obj = {
      //   title: $(item).find('title').text(),
      //   link: $(item).find('link').text(),
      // }
    })
    return itemsByKeyword;
  })
  .then(items => {
    if (items.length === 0) return
    if (!Array.isArray(items)) items = Array.from(items)
    // send email to myself
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return console.log(error);
      }
      console.log('Message sent: ' + info.response);
    });
  })
  .catch(err => {
    console.log(err)
  })
