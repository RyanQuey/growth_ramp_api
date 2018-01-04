module.exports = function canRead (req, res, next) {
  const modelIdentity = req.options.controller
  const modelAttributes = Object.keys(sails.models[modelIdentity].attributes)
  const action = req.options.action
  let fail = (message) => {
    // still going onto next, but with no user set
    console.log("forbidden request for ", action, "on model ", modelIdentity)
    console.log(message);
    console.log("failing data: ", req.params, req.body);
    res.status(400).json("Insufficient permissions")
  };

  let pass = (record) => {
    //saves the database call if used later :)
    //NOTE: doesn't set a record if creating or user is the record's userId/ownerId
    req.matchingRecord = record //make sure not to send a matchingRecord in the body from the front end...not a security issue, but yeah
console.log("matching record", record);

    //strip out empty strings in the body sent to update integers, and save as null instead
    //TODO maybe should make this a separate policy...but this is so much easier...
    let keys = Object.keys(req.body)
    for (let attribute of keys){
      if (req.body[attribute] === "" && Helpers.safeDataPath(sails.models, `${modelIdentity}.attributes.${attribute}.type`, false) !== 'string') {
        //should just set to null
        //if don't want this behavior, set the field to false or whatever you need, just don't send empty string!!
        req.body[attribute] = null
      }
    }
    next()
  }

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
      //still is ok for reading (sinec will only find resources with that userid hopefully??), but not writing
      if (
        //can create anything if it's for yourself!
        ["create", "createfromcampaign", "contactus"].includes(action) || modelIdentity === "accountsubscriptions"

        //ownerId is equivalent of userId, is the one user who made the resource/has full access. NO RECORD SHOULD HAVE BOTH ownerId AND userId!!
        //this doesn't count though if record doesn't have that param, and someone tries to use that param to get in knowing it won't be set in the record itself
      //NOTE: need to remove this, since someone could do an update on someone else's record, to change the record's userId to yours...
        /*userId && modelAttributes.includes('userId') ||
        ownerId && modelAttributes.includes('ownerId')*/
      ) {
console.log(req.user.id, userId, ownerId, req.params);
        if ([userId, ownerId].includes(req.user.id)) {
          pass();
        } else {
          fail(`these userids are not the same: ${userId || ownerId} and ${req.user.id || req.user}`);
        }

      } else {
        //assuming that if no userId or ownerId is specified, only finding one
        //this keeps the db requests in these policies lower
        sails.models[modelIdentity].findOne(parseInt(id))
        .then((record) => {
          if (!record) {
            fail(`Record not found of ${modelIdentity} with ID ${id}`)

          } else if (!req.user) {
            fail("no user!!")
          } else if ([record.userId, record.ownerId].includes(req.user.id)) {
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

