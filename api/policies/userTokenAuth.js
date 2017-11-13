module.exports = function userTokenAuth (req, res, next) {

  let fail = (message) => {
    // still going onto next, but with no user set
    console.log(message)
    next();
  };

  let pass = () => {
    next();
  }

  if (req.get('x-user-token')) {
    let token = req.get('x-user-token');

    let id = req.get('x-id')
    if (id.length > 5) {//removes "user-" from the front
      id = parseInt(id.slice(5))
    }

    Users.findOne({apiToken: token})
    .then((user) => {
      if (!user) {
        fail(`No user found for this token, ${token}`);
      } else if (id === user.id /* && user.apiTokenExpires...*/) {
        req.user = user;
        pass();
      } else {
        fail(`the should match but don't: ${user.id} and user ${id}`)
      }
    }).catch((e) => {
      console.log(e);
      fail(`error trying to retrieve with this token: ${token}`);
    });
  } else {
    fail("no user token for user");
  }
};
