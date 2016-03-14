var mongoose = require('mongoose');
var users = JSON.parse(require('fs').readFileSync(__dirname + '/users.json'));
var domains = JSON.parse(require('fs').readFileSync(__dirname + '/domains.json'));
if (mongoose.connection.readyState === 0) {
  mongoose.connect('mongodb://localhost/test');
}
var domainId;
mongoose.connection.once("open", function() {
  mongoose.connection.db.collection('domains', function(err, col){
		if (err) {
      throw err;
		}
    for (var i in domains) {
      col.insert(domains[i], function(err, result){
        if (err) {
          throw err;
        }
        if (!domainId) {
          domainId = mongoose.Types.ObjectId(result.ops[0]._id);
        }
        if (domains.length-1 == i) {
          mongoose.connection.db.collection('users', function(err, userCol){
		        if (err) {
              throw err;
		        }
            for (var i in users) {
              users[i].domain = domainId;
              console.log(domainId);
              userCol.insert(users[i], function(err, result){
                if (err) {
                  throw err;
                }
                if (users.length-1 == i) {
                  process.exit(); 
                }
              })
            }
	}       );
        }
      })
    }
	});
});

