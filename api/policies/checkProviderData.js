module.exports = function userTokenAuth (req, res, next) {

  let fail = (token) => {
    // still going onto next, but with no user set
    token ? console.log("ERROR: No user found for this token") : console.log("No api token provided. No user returned");

    next();
  };

  let pass = () => {
    next();
  }

  //NOTE: most of the handling is done in the model
  const providerData = req.body
  if (providerData) {
    pass()

  } else {
    fail();
  }
};
