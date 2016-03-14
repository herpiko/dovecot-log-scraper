var should = require("should");
var mongoose = require('mongoose');
if (mongoose.connection.readyState === 0) {
  mongoose.connect('mongodb://localhost/test');
}
var col;
var users;
describe("Check the imported accessLog in users collection", function() {
  before(function(done){
    mongoose.connection.once("open", function() {
      mongoose.connection.db.collection('users', function(err, collection){
        col = collection;
        col.find({}).sort({_id:1}).toArray(function(err, result){
          users = result;
          done();
        })
      })
    })
  })
  // Start unit testing
  it("1st user should have proper accessLog (pop3)", function(done){
    should(users[0].accessLog.lastClientType).equal('pop3');
    should(users[0].accessLog.lastActivity.toString()).equal('Fri Mar 11 2016 15:50:53 GMT+0700 (WIB)');
    done();
  });
  it("4th user should have proper accessLog (webmail)", function(done){
    should(users[3].accessLog.lastClientType).equal('webmail');
    should(users[3].accessLog.lastActivity.toString()).equal('Sun Mar 06 2016 06:25:52 GMT+0700 (WIB)');
    done();
  });
  it("4th user should have proper accessLog (imap)", function(done){
    should(users[5].accessLog.lastClientType).equal('imap');
    should(users[5].accessLog.lastActivity.toString()).equal('Sun Mar 06 2016 06:25:52 GMT+0700 (WIB)');
    done();
  });
});
