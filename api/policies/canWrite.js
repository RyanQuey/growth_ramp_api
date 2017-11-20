module.exports = function canRead (req, res, next) {
  const modelIdentity = req.options.controller
  const modelAttributes = Object.keys(sails.models[modelIdentity].attributes)
  const action = req.options.action
  let fail = (message) => {
    // still going onto next, but with no user set
    console.log("forbidden request for ", action, "on", modelIdentity)
    console.log(message);
    console.log("failing data: ", req.params, req.body);
    res.status(400).json("Insufficient permissions")
  };

  let pass = (record) => {
    //saves the database call if used later :)
    if (!req.body) {
      req.body = {}
    }
    //doesn't set a record if creating or user is the record's userId/ownerId
    req.body.matchingRecord = record //make sure not to send a matchingRecord in the body from the front end...not a security issue, but yeah
console.log("matching record", record);
    next()
  }

console.log(req.body);
  if (req.user) {
    //convert id params into integers
    //these are record's attributes, not the user's...unless user is the record, then it's both
    let id = parseInt(req.param("id"))
    let ownerId = parseInt(req.param("ownerId"))
    let userId = parseInt(req.param("userId"))

    //accesses the model (eg, Users)
    //ie, users

    //this would be modifying their own record, so the body/param id needs to match the userid
    if (modelIdentity === "users" && req.user) {
      //check the possible variables in the same order that sails will to determine target resource
      //otherwise, an attacker could set params to match their own userid, the final user using the req.body
      //using req.params for now, which searches all three.

      if (id == req.user.id) {
        pass();
      } else {
        console.log("should not ever be here");
        fail(`these are not the same: ${id} and ${req.user.id}`);
      }

    //for all other resources
    } else {
      //try to skip a trip to the database by finding and setting the record on the request body
      //as long as we are using this, make sure that no one can change the userId unless admin
      console.log("now will try to ",action, modelIdentity, "with userid", ownerId || userId);
      if (
        //ownerId is equivalent of userId, is the one user who made the resource/has full access. NO RECORD SHOULD HAVE BOTH ownerId AND userId!!
        //this doesn't count though if record doesn't have that param, and someone tries to use that param to get in knowing it won't be set in the record itself
        userId && modelAttributes.includes('userId') ||
        ownerId && modelAttributes.includes('ownerId')
      ) {
        if ([userId, ownerId].includes(req.user.id)) {
          pass();
        } else {
          fail(`these userids are not the same: ${userId} and ${req.user.id}`);
        }

      } else {
        //assuming that if no userId or ownerId is specified, only finding one
        //this keeps the db requests in these policies lower
        sails.models[modelIdentity].findOne(parseInt(id))
        .then((record) => {
          if ([record.userId, record.ownerId].includes(req.user.id)) {
            pass(record)
          } else {
            //eventually, will need to create permissions, using the onCreate Hook
            fail(`these are not the same: ${record.userId || record.ownerId} and ${req.user.id}`)
          }
        })
        .catch((err) => {
          console.log("error in checking permissions");
          fail(err)
        })
      }
    }
  } else {
    fail("user session required to update");
  }
};

