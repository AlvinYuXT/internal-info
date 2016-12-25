'use strict'
var request = require('request-promise'),
  path = require('path'),
  cheerio = require('cheerio'),
  iconv = require('iconv-lite'),
  nodemailer = require('nodemailer'),
  pug = require('pug'),
  config = require('./config.js'),
  transporter = nodemailer.createTransport(config.smtpConfig);

function getOptions(url) {
  return {
    uri: url,
    encoding: null,
    xmlMode: true,
    transform: function (body) {
      body = iconv.decode(body, 'gb2312');
      return cheerio.load(body)
    }
  }
}

function getHtml(file, items) {
  const filePath = path.join(__dirname, file),
    compileFunction = pug.compileFile(filePath);
  return compileFunction(items)
}

var mailOptions = {
  from: config.from, // 发件地址
  to: config.to, // 收件列表
  subject: `${new Date().getMonth() + 1}月${new Date().getDate()}日最新招聘信息`, // 标题
};

var options = getOptions(config.url)

request(options)
  .then($ => {
    var items = $('item');
    var resultsByKeyword = [];
    items.each((i, item) => {
      // return $(item).find('title').text().indexOf(config.keyword) > -1
      let obj = {
        title: $(item).find('title').text(),
        // link: $(item).find('link').html(), 
        link: $(item).find('guid').text(), // 因为htmlparse2解析不出link
      }
      if (obj.title.indexOf(config.keyword) > -1) {
        resultsByKeyword.push(obj);
      }
    })
    return resultsByKeyword;
  })
  .then(items => {
    if (items.length === 0) return
    // console.log(items)
    // send email to myself
    mailOptions.html = getHtml('templates/index.pug', { items });
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return console.log(error);
      }
      console.log(`${new Date()} success`);
    });
  })
  .catch(err => {
    console.log(err)
  })
