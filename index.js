'use strict'
const _ = require('lodash');
const fs = require('fs');
const ReadLine = require('readline');
const moment = require('moment');
const mongoose = require('mongoose');
const path = process.argv[2] || '/var/log/mail.info';
const db = process.env.DB || 'test';
const conf = JSON.parse(fs.readFileSync(__dirname + '/conf.json'));
const host = process.env.HOST || 'localhost';
const exec = require('child_process').exec;
const prefix = '__webmail__';
const clientTypes = ['webmail','imap','pop3'];
const opts = {};
let count = 0;
var totalLines = 0;
let Users;
if (process.env.USER) {
  opts.user = process.env.USER;
}
if (process.env.PASS) {
  opts.pass = process.env.PASS;
}
if (mongoose.connection.readyState === 0) {
  mongoose.connect('mongodb://' + host + '/' + db, opts, function(err){
    if (err) {
      console.log(err);
      process.exit();
    }
  });
}
mongoose.connection.once('open', function(){
  mongoose.connection.db.collection('users', start);
});

var prepare = function() {
  return new Promise(function(resolve, reject){
    mongoose.connection.db.collection('domains', function(err, Domains){
      if (err) {
        console.log(err);
        process.exit();
      }
      Domains.find()
      .toArray(function(err, domains){
        if (err) {
          console.log(err);
          process.exit();
        }
        exec('wc -l ' + path, function (err, total) {
          if (err) {
            console.log(err);
            process.exit();
          }
          totalLines = parseInt(total.split(' ')[0]);
          resolve(domains, total);
        });
      })
    })
  })
}

var checkUser = function(query) {
  return new Promise(function(resolve, reject){
    Users.findOne(query, function(err, result){
      if (err) {
        return reject(err);
      }
      if (!result) {
        return resolve(null);
      }
      resolve(result);
    })
  })
}

var updateAccessLog = function(query, accessLog) {
  return new Promise(function(resolve, reject) {
    Users.findOneAndUpdate(query,
    { $set : { accessLog : accessLog }}, 
    {upsert : true }, function(err, result) {
      if (err) {
        return reject(err);
      } 
      resolve(); 
    })
  })
}

var checkCount = function() {
  count++;
  console.log(count);
  console.log(totalLines);
  if (count >= totalLines) {
    console.log('Done!');
    process.exit();
  }
}

var start = function(err,col){
  Users = col;
  if (err) {
    console.log(err);
    process.exit();
  }
  prepare()
  .then(function(domainMap, totalLines) {
    totalLines = totalLines;
    let notFound = [];
    let rd = ReadLine.createInterface({
      input : fs.createReadStream(path),
      output : process.stdout,
      terminal : false,
    });
    rd.on('line', function(line){
      if (line.length === 0) {
        checkCount();
        return;
      }
      let accessLog = {};
      let email = '';
      let splitted = line.split(' ' + conf.hostname + ' [dovecot]');
      accessLog.lastActivity = new Date(splitted[0]);
      let log = splitted[1];
      if (log.indexOf('Login: user=') === -1) {
        checkCount();
        return;
      }
      log = log.split(',')[0];
      email = log.split('<')[1].split('>')[0];
      if (email.indexOf(prefix) > -1) {
        email = email.replace(prefix, '');
        accessLog.lastClientType = 'webmail';
      } else {
        accessLog.lastClientType =  log.split('-login')[0]
                                      .replace(/ /g,'')
                                      .split(':')[1];
      }
      let domain = email.split('@')[1];
      let username = email.split('@')[0];

      _.some(domainMap, function(d){
        if (d.name === domain) {
          domain = d._id;
          return
        }
      });
      // VALUE CHECK

      // Should have a valid clientType
      let isValidClientType = _.some(clientTypes, function(clientType){
        return clientType === accessLog.lastClientType;
      });
      if (!isValidClientType) {
        console.log('Not a valid clientType');
        checkCount();
        process.exit();
      }
      // Should have a valid date
      if (accessLog.lastActivity.toString() === 'Invalid Date') {
        console.log('Not a valid date value');
        console.log(line);
        checkCount();
        process.exit();
      }
      let query = {
        username : username,
        domain : domain
      }
      console.log(accessLog);
      console.log(query);

      checkUser(query)
      .then(function(result) {
        if (!result) {
          if (notFound.indexOf(username) === -1) {
            notFound.push(username);
          }
          console.log('User not found');
          checkCount();
          return;
        }
        if (result.accessLog && 
        result.accessLog.lastActivity &&
        result.accessLog.lastActivity > accessLog.lastActivity) {
          console.log('accessLog already exists');
          checkCount();
          return;
        }
        updateAccessLog(query, accessLog)
        .then(function() {
          console.log('Successfully update accessLog ');
          checkCount();
        })
        .catch(function(err){
          throw err;
          process.exit();
        })
      })
      .catch(function(err){
        throw err;
        process.exit();
      })
    })
  })
  .catch(function(err){
    throw err;
    process.exit();
  })
}
