module.exports = function canRead (req, res, next) {
  const modelIdentity = req.options.controller
  const action = req.options.action
  let fail = (message) => {
    // still going onto next, but with no user set
    console.log("failing request for ", action, "on", modelIdentity)
    console.log(message);
    console.log("failing data: ", req.params, req.body);
    res.status(400).json("Insufficient permissions")
  };

  let pass = (record) => {
    //saves the database call if used later :)
    if (!req.body) {
      req.body = {}
    }
    req.body.matchingRecord = record //make sure not to send a matchingRecord in the body from the front end...not a security issue, but yeah
    next()
  }

  if (req.user) {
    //accesses the model (eg, Users)
    //ie, users

    //this would be modifying their own record, so the body/param id needs to match the userid
    if (modelIdentity === "users" && req.user) {
      //check the possible variables in the same order that sails will to determine target resource
      //otherwise, an attacker could set params to match their own userid, the final user using the req.body
      //using req.params for now, which searches all three.
      if (req.param("id") == req.user.id) { //one of these is a string
        pass();
      } else {
        fail(`these are not the same: ${req.param("id")} and ${req.user.id}`);
      }

    //for all other resources
    } else {
      //try to skip a trip to the database by finding and setting the record on the request body
      //as long as we are using this, make sure that no one can change the userId unless admin
      if (req.param("userId")) {
        if (req.param("userId") == req.user.id) { //one of these is a string
          pass();
        } else {
          fail(`these userids are not the same: ${req.param("userId")} and ${req.user.id}`);
        }

      } else {
        sails.models[modelIdentity].find(req.param("id"))
        .then((record) => {
          if (record.userId == req.user.id) {
            pass(record)
          } else {
            //eventually, will need to create permissions, using the onCreate Huck
            fail(`these are not the same: ${record.userId} and ${req.user.id}`)
          }
        })
        .catch((err) => {
          console.log("error in checking permissions");
          fail()
        })
      }
    }
  } else {
    fail();
  }
};

