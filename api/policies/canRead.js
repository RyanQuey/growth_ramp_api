module.exports = function canRead (req, res, next) {
  let fail = () => {
    // still going onto next, but with no user set
    console.log("failing request");
    res.status(400).json("Insufficient permissions")
  };

  let pass = (record) => {
    req.body.matchingRecord = record //make sure not to send a matchingRecord in the body from the front end...not a security issue, but yeah
    next();
  }

  if (req.user) {
    //ie, UsersController > users
    const modelIdentity = req.target.controller.replace("Controller", "").toLowerCase()
    //accesses the model (eg, Users)


    const user = req.user;

    //this would be modifying their own record, so the body/param id needs to match the userid
    if (modelIdentity === "users" && user) {
      //check the possible variables in the same order that sails will to determine target resource
      //otherwise, an attacker could set params to match their own userid, the final user using the req.body
      //using req.params for now, which searches all three.
      if (req.params.id === user.id) {
        pass();
      } else {
        fail();
      }

    //for all other resources
    } else {
      //try to skip a trip to the database by finding and setting the record on the request body
      //as long as we are using this, make sure that no one can change the userId unless admin
       sails.models[modelIdentity].find(req.params.id)
       .then((record) => {
         if (record.userId === req.user.id) {
           pass(record)
         } else {
           //eventually, will need to create permissions, using the onCreate Huck
           fail()
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

