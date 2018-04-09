/**
 * Default model configuration
 * (sails.config.models)
 *
 * Unless you override them, the following properties will be included
 * in each of your models.
 *
 * For more info on Sails models, see:
 * http://sailsjs.org/#!/documentation/concepts/ORM
 */

module.exports.models = {

  /***************************************************************************
  *                                                                          *
  * Your app's default connection. i.e. the name of one of your app's        *
  * connections (see `config/connections.js`)                                *
  *                                                                          *
  ***************************************************************************/
  connection: 'development',

  /***************************************************************************
  *                                                                          *
  * How and whether Sails will attempt to automatically rebuild the          *
  * tables/collections/etc. in your schema.                                  *
  *                                                                          *
  * See http://sailsjs.org/#!/documentation/concepts/ORM/model-settings.html  *
  *                                                                          *
  ***************************************************************************/
  migrate: 'safe',
  updateOrCreate: function(criteria, values, cb) {
    return new Promise((resolve, reject) => {
      //is no values are specified, use criteria
      if (!values) {values = criteria.where ? criteria.where : criteria};

      this.findOne(criteria, (err, result) => {
        if (err) {
          if (typeof cb === "function") {
            return cb(err, false)
          } else {
            console.log(err);
            return
          }

        } else if (result) {
          return resolve(this.update(criteria, values, cb))

        } else {
          return resolve(this.create(values, cb))
        }
      })
    });
  },

  attributes: {
    id: { type: 'integer', autoIncrement: true, primaryKey: true },
  },

  //currently will convert any model attribute that is json to convert integer strings (eg "2") and boolean strings ("true") to integers (2) and booleans (true)
  //params should be obj with params to create/update db (so keys are model attributes)
  //it's beacuse form-data converts json to string
  convertJSONData: function (params) {
    Object.keys(params).map((attribute) => {
      if (["array", "json"].includes(this.attributes[attribute].type)) {
        let value = params[attribute]
        params[attribute] = _recursiveFixJson(value)
      }
    })

    // return value doesn't matter; just mutate
  },
};

// return value does matter for this. Have to mutate the original params obj, but not the values of the obj
function _recursiveFixJson (thing) {
  let translatedThing
  if (typeof thing === "object") {
    if (Array.isArray(thing)) {
      translatedThing = thing.map(_recursiveFixJson)
    } else {
      translatedThing = {}
      for (let key of Object.keys(thing) ) {
        value = thing[key]
        translatedThing[key] = _recursiveFixJson(value)
      }
    }

  } else if (typeof thing === "string") {
    try {
      // if eg "1" or "true" becomes 1 or true
console.log("NOW TRANSLATING!!");
      translatedThing = JSON.parse(value)

    } catch (err) {
      // if different string, doesn't worK
      translatedThing = thing
    }
  }

  return translatedThing
}
