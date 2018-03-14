module.exports = function canRead (req, res, next) {
  const modelIdentity = req.options.controller
  const modelAttributes = Object.keys(sails.models[modelIdentity].attributes)
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
    req.matchingRecord = record //make sure not to send a matchingRecord in the body from the front end...not a security issue, but yeah

    //only return unarchived if grabbing more than one
    //TODO not tested
    if (!req.param("id")) {
      let whereParams
      if (req.query.where) {
        whereParams = JSON.parse(req.query.where)
        //leave it alone in the offchance it is already set
        whereParams.status = whereParams.status ? whereParams.status : { "!": "ARCHIVED" }

      } else {
        whereParams = {
          status: {
            "!": "ARCHIVED"
          }
        }
      }

      // pass in query/params into the where clause
      const otherParams = _.omit(req.allParams(), ["where"])
      whereParams = Object.assign({}, whereParams, otherParams)
      req.query.where = JSON.stringify(whereParams)
    }

    next()
  }

  if (req.user) {
    //convert id params into integers
    //these are record's attributes, not the user's...unless user is the record, then it's both
    let id = parseInt(req.param("id"))
    let ownerId = parseInt(req.param("ownerId"))
    let userId = parseInt(req.param("userId"))

    req.query.userId = userId //test if this works

    //accesses the model (eg, Users)
    //ie, users


    //this would be modifying their own record, so the body/param id needs to match the userid
    if (modelIdentity === "users") {
      //check the possible variables in the same order that sails will to determine target resource
      //otherwise, an attacker could set params to match their own userid, the final user using the req.body
      //using req.params for now, which searches all three.
      if (action === "populate") {
        //might want to set id as parentit for other models when populating as well
        id = req.param("parentid")
      }

      if (id == req.user.id) {
        pass();
      } else {
        fail(`these are not the same: ${id} and ${req.user.id}`);
      }

    } else if (
      //try to skip a trip to the database by finding and setting the record on the request body
      //as long as we are using this, make sure that no one can change the userId unless admin
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

    //certain actions, it doesn't matter as long as there is a user
    } else if (["getallgaaccounts", "getanalytics", "auditcontent"].includes(action)) {
      pass()

    } else {
        //assuming that if no userId or ownerId is specified, only finding one
        //this keeps the db requests in these policies lower
        sails.models[modelIdentity].findOne(id)
        .then((record) => {
          if (record.userId == req.user.id || record.ownerId == req.user.id ) {
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
  } else {
    fail();
  }
};

