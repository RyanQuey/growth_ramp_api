module.exports = function userTokenAuth (req, res, next) {

  let fail = (token) => {
    // still going onto next, but with no user set
    token ? console.log("ERROR: No user found for this token") : console.log("ERROR: No token provided. No user returned");

    next();
  };

  let pass = () => {
    next();
  }

  if (req.get('x-user-token')) {
    console.log("now checking token");
    let token = req.get('x-user-token');

    Users.findByApiToken(token)
    .then((user) => {
      req.user = user;
      pass();
    }).catch((e) => {
      fail(token);
    });
  } else {
    fail();
  }
};
