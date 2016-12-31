'use strict'

const requestLib = require('request'),
  jar = requestLib.jar(),
  cheerio = require('cheerio'),
  path = require('path'),
  iconv = require('iconv-lite'),
  log4js = require('log4js'),
  assert = require('assert'),
  co = require('co'),
  parallel = require('co-parallel'),
  config = require('./config'),
  thenifyAll = require('thenify-all'),
  qs = require('querystring');

log4js.configure({
  appenders: [
    {
      type: 'console',
    }, {
      type: 'DateFile',
      filename: 'logs/spider.log',
      pattern: '-yyyy-MM-dd',
      alwaysIncludePattern: false,
      category: 'spider'
    }
  ],
  levels: {
    '[all]': 'ALL',
    spider: 'ALL'
  }
})

let request = requestLib.defaults({
  jar: jar,
  baseUrl: 'https://bbs.byr.cn',
  // headers: {
  //   'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36',
  //   'x-requested-with': 'XMLHttpRequest'
  // }
});
request = thenifyAll(request, {}, ['get', 'post']);


const logger = log4js.getLogger('spider');

/**
 * 
 * Sign in the byrbbs
 * @param {Object} conf
 */
let login = co.wrap(function* (conf) {
  // let cookies = jar.getCookies('https://bbs.byr.cn');
  const config = conf,
    form = {
      id: config.id,
      passwd: config.passwd
    };
  let resJson = yield request.post({ url: '/user/ajax_login.json', form, 'x-requested-with': 'XMLHttpRequest' });
  resJson = JSON.parse(resJson[0].body);
  assert.equal(resJson.ajax_code, '0005', resJson.ajax_msg);
  logger.info('login ssucessfully');
})

/**
 * 
 * 
 * @param {Array} urls
 * @param {Number} num the parallel num
 */
let fetchRss = co.wrap(function* (urls, num) {
  logger.debug('fetch begin');
  if (Array.isArray(urls) === false) urls = Array(urls);
  function* status(url) {
    let res;
    try {
      res = yield request.get({ url, encoding: null });
    } catch (e) {
      logger.error(`Cannot get ${url}`)
    }
    assert.equal(res[0].toJSON().statusCode, '200', `fetch ${url} ${res.statusCode}`);
    // maybe here need decode
    let body = iconv.decode(res[1], 'gb2312');
    logger.debug('fetch end')
    return parseXml(body);
  }

  let urlGen = urls.map(status);
  let result = yield parallel(urlGen, num);
  return result;
})

let parseXml = function (xml, keyword) {
  if (xml === null || xml === undefined) return;
  keyword = keyword || config.keyword;
  const $ = cheerio.load(xml);
  const items = $('item');
  let resultsByKeyword = [];
  items.each((i, item) => {
    let obj = {
      title: $(item).find('title').text(),
      link: $(item).find('guid').text(), // 因为htmlparse2解析不出link
    }
    if (obj.title.indexOf(config.keyword) > -1) {
      resultsByKeyword.push(obj);
    }
  })
  return resultsByKeyword;
}

co(function* () {
  let result;
  // try {
  //   yield login(config)
  // } catch (e) {
  //   logger.error(`login error ${e}`)
  // }
  try {
    result = yield fetchRss(config.urls, 3)
    logger.info(result[0])
  } catch (e) {
    logger.error(`Network error: ${e}`)
  }
})
