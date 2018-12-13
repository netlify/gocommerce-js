import API from "micro-api-client";
import {calculatePrices} from "./calculator";
import {checkClaims} from './claims';

const HTTPRegexp = /^http:\/\//;
const cartKey = "gocommerce.shopping-cart";
const vatnumbers = {};


function getPrice(prices, currency, user) {
  return prices
    .filter((price) => currency == (price.currency || "USD").toUpperCase())
    .filter((price) => price.claims ? checkClaims(user && user.claims && user.claims(), price.claims) : true)
    .map((price) => {
      price.cents = price.cents || parseInt(parseFloat(price.amount) * 100);
      return price;
    })
    .sort((a, b) => a.cents - b.cents)[0];
}

function priceObject(cents, currency) {
  return {cents, amount: centsToAmount(cents), currency};
}

function addPrices(...prices) {
  const result = {
    cents: 0,
  };
  prices.forEach((price) => {
    if (price) {
      if (!price.hasOwnProperty("cents")) {
        price.cents = parseInt(parseFloat(price.amount) * 100);
      }
      result.cents += price.cents;
      result.currency = price.currency;
    }
  });
  result.amount = centsToAmount(result.cents);
  return result;
}

function centsToAmount(cents) {
  return `${(Math.round(cents) / 100).toFixed(2)}`;
}


function pathWithQuery(path, params, options) {
  const negatedParams = options ? options.negatedParams : null;
  const query = [];
  if (params) {
    for (const key in params) {
      query.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    }
  }
  if (negatedParams) {
    for (const key in negatedParams) {
      query.push(`${encodeURIComponent(key)}!=${encodeURIComponent(negatedParams[key])}`);
    }
  }
  return query.length > 0 ? `${path}?${query.join("&")}` : path;
}

function cleanPath(path) {
  return path.replace(/^https?:\/\/[^\/]+/, '');
}

export default class GoCommerce {
  constructor(options) {
    if (!options.APIUrl) {
      throw('You must specify an APIUrl of your GoCommerce instance');
    }
    if (options.APIUrl.match(HTTPRegexp)) {
      console.log('Warning:\n\nDO NOT USE HTTP IN PRODUCTION FOR GOCOMMERCE EVER!\GOCOMMERCE REQUIRES HTTPS to work securely.')
    }
    this.cartKey = options.cartKey || cartKey;

    this.api = new API(options.APIUrl);
    this.currency = options.currency || "USD";
    this.billing_country = options.country;
    this.settings_path = "/gocommerce/settings.json";
    this.settings_refresh_period = options.settingsRefreshPeriod || (10 * 60 * 1000);
    this.loadCart();
  }

  setUser(user) {
    this.user = user;
  }

  addToCart(item) {
    const {quantity, meta} = item;
    const path = cleanPath(item.path);
    if (quantity && path) {
      return fetch(path).then((response) => {
        if (!response.ok) { return Promise.reject(`Failed to fetch ${path}`); }

        return response.text().then((html) => {
          const doc = document.implementation.createHTMLDocument("product");
          doc.documentElement.innerHTML = html;
          const products = Array.from(doc.getElementsByClassName("gocommerce-product"))
            .map((el) => JSON.parse(el.innerHTML));

          if (products.length === 0) {
            return Promise.reject("No .gocommerce-product found in product path");
          }

          const sku = products.length === 1 ? (item.sku || products[0].sku) : item.sku;

          const product = products.find((prod) => prod.sku === sku);
          if (!product) {
            return Promise.reject(`No .gocommerce-product matching sku=${sku} found in product path`);
          }

          const {title, prices, description, type, vat} = product;
          if (sku && title && prices) {
            if (this.line_items[sku]) {
              this.line_items[sku].quantity += quantity;
              if (meta) {
                this.line_items[sku].meta = Object.assign({}, this.line_items[sku].meta, meta);
              }
            } else {
              this.line_items[sku] = Object.assign(product, {path, meta, quantity});
            }
            if (item.addons && product.addons) {
              this.line_items[sku].addons = product.addons.filter((addon) => item.addons.indexOf(addon.sku) !== -1);
              this.line_items[sku].addonPrice = addPrices(...this.line_items[sku].addons.map((addon) => addon.price));
            } else {
              delete this.line_items[sku].addons;
            }
            return this.loadSettings().then(() => {
              this.persistCart();
              return this.getCart();
            });
          } else {
            return Promise.reject("Failed to read sku, title and price from product path: %o", {sku, title, prices});
          }
        });
      });
    } else {
      return Promise.reject("Invalid item - must have path and quantity");
    }
  }

  getCartItem(item_data) {
    const item = Object.assign({}, item_data, {
      price: getPrice(item_data.prices, this.currency, this.user)
    });
    (item.price.items || []).forEach((priceItem) => {
      priceItem.cents = (parseFloat(priceItem.amount) * 100).toFixed(0);
    });
    if (item_data.addons) {
      item.addons = [];
      item_data.addons.forEach((addon) => {
        item.addons.push(Object.assign({}, addon, {
          price: getPrice(addon.prices, this.currency, this.user)
        }));
      });
    }
    if (item.addons) {
      item.addonPrice = priceObject(
        item.addons.reduce((sum, addon) => sum + parseFloat(addon.price.amount) * 100, 0),
        this.currency
      );
    }
    return item;
  }

  calculatePrice(item_data, claims) {
    const item = this.getCartItem(item_data);
    claims = claims || (this.user && this.user.claims && this.user.claims());
    return calculatePrices(this.settings, claims, this.billing_country, this.currency, this.coupon, [item]);
  }

  getCart() {
    const cart = {items: {}};
    const items = [];
    for (const key in this.line_items) {
      const item = cart.items[key] = this.getCartItem(this.line_items[key]);
      items.push(item);
    }

    const claims = this.user && this.user.claims && this.user.claims();
    const price = calculatePrices(this.settings, claims, this.billing_country, this.currency, this.coupon, items);

    cart.subtotal = priceObject(price.subtotal, this.currency);
    cart.discount = priceObject(price.discount, this.currency);
    cart.couponDiscount = priceObject(price.couponDiscount, this.currency);
    cart.memberDiscount = priceObject(price.memberDiscount, this.currency);
    cart.netTotal = priceObject(price.netTotal, this.currency);
    cart.taxes = priceObject(price.taxes, this.currency);
    cart.total = priceObject(price.total, this.currency);

    price.items.forEach((priceItem, key) => {
      const item = items[key];
      if (!item) {
        return;
      }
      cart.items[item.sku] = {
        ...item,
        calculation: priceItem,
      }
    });

    return cart;
  }

  setCurrency(currency) {
    this.currency = currency;
    return Promise.resolve(this.getCart());
  }

  setCountry(country) {
    this.billing_country = country;
    return Promise.resolve(this.getCart());
  }

  setVatnumber(vatnumber) {
    this.vatnumber = vatnumber;
    return this.verifyVatnumber(vatnumber).then(() => this.getCart());
  }

  setCoupon(code) {
    if (code == null) {
      this.coupon = null;
      return Promise.resolve(null);
    }
    return this.verifyCoupon(code).then((coupon) => {
      this.coupon = coupon;
      return coupon;
    });
  }

  updateCart(sku, quantity) {
    if (this.line_items[sku]) {
      if (quantity > 0) {
        this.line_items[sku].quantity = quantity;
      } else {
        delete this.line_items[sku];
      }
      this.persistCart();
    } else {
      throw(`Item ${sku} not found in cart`);
    }
  }

  clearCart() {
    this.line_items = {};
    this.persistCart();
  }

  order(orderDetails) {
    const {
      email,
      shipping_address, shipping_address_id,
      billing_address, billing_address_id,
      data
    } = orderDetails;

    if (email && (shipping_address || shipping_address_id)) {
      const line_items = [];
      for (const id in this.line_items) {
        line_items.push(this.line_items[id]);
      }

      return this.authHeaders().then((headers) => this.api.request("/orders", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          email,
          shipping_address, shipping_address_id,
          billing_address, billing_address_id,
          vatnumber: this.vatnumber_valid ? this.vatnumber : null,
          currency: this.currency,
          coupon: this.coupon ? this.coupon.code : null,
          data,
          line_items
        })
      })).then((order) => {
        const cart = this.getCart();
        return {cart, order};
      });
    } else {
      return Promise.reject(
        "Invalid orderDetails - must have an email and either a shipping_address or shipping_address_id"
      );
    }
  }

  payment(paymentDetails) {
    const {order_id, amount, provider, stripe_token, paypal_payment_id, paypal_user_id} = paymentDetails;
    if (order_id && amount != null && provider && (stripe_token || (paypal_payment_id && paypal_user_id))) {
      const cart = this.getCart();
      return this.authHeaders().then((headers) => this.api.request(`/orders/${order_id}/payments`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          amount,
          order_id,
          provider,
          stripe_token,
          paypal_payment_id,
          paypal_user_id,
          currency: this.currency
        })
      }));
    } else {
      return Promise.reject(
        "Invalid paymentDetails - must have an order_id, an amount, a provider, and a stripe_token or a paypal_payment_id and paypal_user_id"
      );
    }
  }

  resendConfirmation(orderID, email) {
    const path = `/orders/${orderID}/receipt`;
    return this.authHeaders().then((headers) => this.api.request(path, {
      headers,
      method: "POST",
      body: JSON.stringify({email})
    }));
  }

  claimOrders() {
    if (this.user) {
      return this.authHeaders().then((headers) => this.api.request("/claim", {
        headers,
        method: "POST"
      }));
    }
    return Promise.resolve(null);
  }

  updateOrder(orderId, attributes) {
    return this.authHeaders(true).then((headers) => this.api.request(`/orders/${orderId}`, {
      headers,
      method: "PUT",
      body: JSON.stringify(attributes)
    }));
  }

  orderHistory(params, options) {
    const negatedParams = options ? options.negatedParams : null;
    let path = "/orders";
    if (params && params.user_id) {
      path = `/users/${params.user_id}/orders`;
      delete params.user_id;
    }
    path = pathWithQuery(path, params, negatedParams);
    return this.authHeaders(true).then((headers) => this.api.request(path, {
      headers
    })).then(({items, pagination}) => ({orders: items, pagination}));
  }

  orderDetails(orderID) {
      return this.authHeaders().then((headers) => this.api.request(`/orders/${orderID}`, {
        headers
      }));
  }

  orderReceipt(orderID, template) {
    let path = `/orders/${orderID}/receipt`;
    if (template) {
      path += `?template=${template}`;
    }
    return this.authHeaders(true).then((headers) => this.api.request(path, {
      headers
    }));
  }

  userDetails(userId) {
    userId = userId || (this.user && this.user.id);

    return this.authHeaders(true).then((headers) => this.api.request(`/users/${userId}`, {
      headers
    }));
  }

  downloads(params) {
    let path = "/downloads";
    if (params && params.order_id) {
      path = `/orders/${params.order_id}/downloads`;
      delete params.order_id;
    }
    path = pathWithQuery(path, params);
    return this.authHeaders().then((headers) => this.api.request(path, {
      headers
    })).then(({items, pagination}) => ({downloads: items, pagination}));
  }

  downloadURL(downloadId) {
    const path = `/downloads/${downloadId}`;
    return this.authHeaders().then((headers) => this.api.request(path, {
      headers
    })).then((response) => response.url);
  }

  deleteUsers(userIds) {
    const path = "/users" + (userIds.length > 0 ? ("?" + userIds.map(id => `id=${id}`).join("&")) : "");
    return this.authHeaders(true).then((headers) => this.api.request(path, {
      method: "DELETE",
      headers
    }))
  }

  users(params) {
    const path = pathWithQuery("/users", params);
    return this.authHeaders(true).then((headers) => this.api.request(path, {
      headers
    })).then(({items, pagination}) => ({users: items, pagination}));
  }

  report(name, params) {
    const path = pathWithQuery(`/reports/${name}`, params);
    return this.authHeaders(true).then((headers) => this.api.request(path, {
      headers
    }));
  }

  authHeaders(required) {
    if (this.user) {
      return this.user.jwt().then((token) => ({Authorization: `Bearer ${token}`}));
    }
    return required ? Promise.reject(
      "The API action requires authentication"
    ) : Promise.resolve({});
  }

  loadCart() {
    const json = localStorage.getItem(this.cartKey);
    if (json) {
      const cart = JSON.parse(json);
      this.settings = cart.settings;
      this.line_items = cart.line_items || {};
    } else {
      this.settings = null;
      this.line_items = {};
    }
  }

  loadSettings() {
    if (this.settingsAreFresh()) { return Promise.resolve(); }

    return fetch(this.settings_path).then((response) => {
      if (!response.ok) { return; }

      return response.json().then((json) => {
        this.settings = Object.assign(json, {ts: new Date().getTime()});
      });
    });
  }

  settingsAreFresh() {
    if (this.settings_path == null) { return true; }

    if (this.settings) {
      const diff = new Date().getTime() - this.settings.ts;
      return diff < this.settings_refresh_period;
    }

    return false;
  }

  verifyVatnumber(vatnumber) {
    this.vatnumber_valid = false;
    if (!vatnumber) {
      this.vatnumber_valid = false;
      return Promise.resolve(false);
    }
    if (vatnumbers[vatnumber]) {
      this.vatnumber_valid = vatnumbers[vatnumber].valid;
      return Promise.resolve(false);
    }

    return this.api.request(`/vatnumbers/${vatnumber}`).then((response) => {
      vatnumbers[vatnumber] = response;
      this.vatnumber_valid = response.valid;
      return response.valid;
    });
  }

  verifyCoupon(code) {
    return this.authHeaders(false).then((headers) => this.api.request(`/coupons/${code}`, {
      headers
    }));
  }

  persistCart() {
    const json = JSON.stringify({line_items: this.line_items, settings: this.settings});
    localStorage.setItem(this.cartKey, json);
  }
}

if (typeof window !== "undefined") {
  window.GoCommerce = GoCommerce
}
