var Job = require('./job');
var moment = require('moment');
var Mailgun = require('mailgun-js')
var _ = require('lodash');

module.exports = class AutomaticInvoicing extends Job {
  constructor (options) {
    super();
    this.now().every('12 hours');

    // TODO: This needs to be put somewhere.
    this.mailgunClient = Mailgun({ apiKey: 'key-51b635ca5f4f8bd79f5ec37d68a4539d', domain: 'urnextinline.com' });

    this.running = false;
    this.toDo = 0;
    this.done = 0;
    this.upToToday = options.upToToday || false;
    return this;
  }

  finish () {
    this.done += 1;
    if (this.toDo === this.done) {
      this.running = false;
      this.toDo = 0;
      this.done = 0;
    }
  }

  createInvoice (org) {
    let items = [];
    let beginning = moment().utc().subtract(1, 'month').startOf('month').format();
    let end = moment().utc().startOf('month').format();

    if (this.upToToday) {
      end = moment().utc().format();
    }

    let billableItemSearch = { invoicedExternally: false, invoiceId: null, organizationId: org.id, itemDate: { '>=': beginning, '<': end } };
    let monthlySearch = _.merge({}, billableItemSearch);
    monthlySearch.itemType = "MonthlyFee";

    // we only want to charge for monthly fees once, but since we create this one, we need to make sure we
    // DO get any existing one.
    delete monthlySearch.invoicedExternally;
    delete monthlySearch.invoiceId;

    // look for the monthly bit.
    BillableItems.find(monthlySearch)
    .then((items) => {
      if (items.length > 0) {
        // it already exists, we don't have to create it.
        return BillableItems.find(billableItemSearch);
      } else {
        return BillableItems.create({ itemType: "MonthlyFee", organizationId: org.id, itemDate: moment().utc().subtract(1, 'month').startOf('month').format('M/D/YY') })
        .then((bi) => {
          return BillableItems.find(billableItemSearch)
        });
      }
    })
    .then((its) => {
      items = its;
      return Settings.findOneByName('pricing');
    })
    .then((pricingSetting) => {
      let pricing = pricingSetting.data.subscriptions[org.subscriptionLevel || 'basic'];
      let descriptions = pricingSetting.data.descriptions;
      let itemTypeCounts = _.countBy(items, "itemType");

      // Custom organization pricing.
      if (org.subscriptionLevel === "custom" && (pricingSetting.data.organizations && pricingSetting.data.organizations[org.id])) {
        pricing = pricingSetting.data.organizations[org.id];
      }

      // types to be concerned with are Reservation and MonthlyFee
      let itemTypes = Object.keys(itemTypeCounts);
      let products = [];

      if (itemTypes.indexOf('Reservation') !== -1) {
        let price = pricing.pricePerReservation;
        let quantity = itemTypeCounts.Reservation - pricing.freeReservations;
        products.push(InvoiceNinja.item('Reservation', quantity, price, descriptions.Reservation));
      }

      if (itemTypes.indexOf('MonthlyFee') !== -1) {
        let price = pricing.monthlyFee;
        let quantity = 1;
        let name = org.subscriptionLevel || 'free';
        name = Helpers.capitalize(name);
        name += ' Subscription Monthly Fee';

        if (price) {
          products.push(InvoiceNinja.item(name, quantity, price, descriptions.MonthlyFee));
        }
      }

      sails.log.debug('products for this org: ', products);

      if (products.length > 0) {
        InvoiceNinja.createInvoice(org, products)
        .then((invoice) => {
          sails.log.debug('Created an InvoiceNinja invoice: ', invoice);
          return BillableItems.update(billableItemSearch, { invoiceId: invoice.id, invoicedExternally: true })
        })
        .then((bi) => {
          return this.finish();
        });
      } else {
        this.finish();
      }
    })
    .catch((err) => { sails.log.error(err); this.finish(); });

    return;
  }

  run () {
    sails.log.debug(moment().toString(), 'Check to see if we should create an invoice!');
    if (this.running) {
      sails.log.debug('already running...');
      return;
    }

    this.running = true;

    // get a list of organizations and their invoices
    Organizations.find({ archived: false }).populate('vendorId')
    .then((orgs) => {
      orgs = orgs.filter((o) => { return o.vendorId.automaticInvoicing; })
      this.toDo = orgs.length;
      this.done = 0;
      for (let org of orgs) {
        setTimeout(() => { this.createInvoice(org); }, 0);
      }

      return;
    })
    .catch(sails.log.error);
  }
}
