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
    //is no values are specified, use criteria
    if (!values) {values = criteria.where ? criteria.where : criteria};

    this.findOne(criteria, (err, result) => {
      if (err) return cb(err, false);

      if (result) {
        this.update(criteria, values, cb);
      } else {
        this.create(values, cb);
      }
    });
  },

  attributes: {
    id: { type: 'integer', autoIncrement: true, primaryKey: true },
  }

};
