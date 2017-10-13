module.exports = function userTokenAuth (req, res, next) {

  let fail = (token) => {
    // still going onto next, but with no user set
    token ? console.log("ERROR: No user found for this token") : console.log("No api token provided. No user returned");

    next();
  };

  let pass = () => {
    next();
  }

  if (req.get('x-user-token')) {
    console.log("now checking token");
    let token = req.get('x-user-token');

    Users.findOne({apiToken: token})
    .then((user) => {
      if (!user) {
        fail(token);
      } else if (req.get('x-id') === user.id) {
        req.user = user;
        pass();
      } else {fail(token, user)}
    }).catch((e) => {
      fail(token);
    });
  } else {
    fail();
  }
};
