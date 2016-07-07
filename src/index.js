import API from "./api";

const HTTPRegexp = /^http:\/\//;
const cartKey = "gocommerce.shopping-cart";

export default class Gocommerce {
  constructor(options) {
    if (!options.APIUrl) {
      throw("You must specify an APIUrl of your Gocommerce instance");
    }
    if (!options.APIUrl.match(HTTPRegexp)) {
      console.log('Warning:\n\nDO NOT USE HTTP IN PRODUCTION FOR GOCOMMERCE EVER!\GOCOMMERCE REQUIRES HTTPS to work securely.')
    }

    this.api = new API(options.APIUrl);
    this.loadCart();
  }

  setUser(user) {
    this.user = user;
  }

  addToCart(item) {
    const {title, sku, description, price, quantity, path, meta} = item;
    if (title && sku && description && price && quantity && path) {
      if (this.cart[sku]) {
        this.cart[sku].quantity += quantity;
      } else {
        this.cart[sku] = {title, sku, path, description, price, quantity, meta};
      }
      this.persistCart();
      return this.getCart();
    } else {
      throw("Invalid item - must have title, path, sku, description, price and quantity");
    }
  }

  getCart() {
    return Object.assign({}, this.cart);
  }

  updateCart(sku, quantity) {
    if (this.cart[sku]) {
      if (quantity > 0) {
        this.cart[sku].quantity = quantity;
      } else {
        delete this.cart[sku];
      }
      this.persistCart();
    } else {
      throw(`Item ${sku} not found in cart`);
    }
  }

  clearCart() {
    this.cart = {};
    this.persistCart();
  }

  order(orderDetails) {
    const {
      email,
      shipping_address, shipping_address_id,
      billing_address, billing_address_id
    } = orderDetails;

    if (email && (shipping_address || shipping_address_id)) {
      const line_items = [];
      for (const id in this.cart) {
        line_items.push(this.cart[id]);
      }

      return this.authHeaders().then((headers) => this.api.request("/orders", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          email,
          shipping_address, shipping_address_id,
          billing_address, billing_address_id,
          line_items
        })
      })).then((order) => {
        this.clearCart();
        return order;
      });
    } else {
      return Promise.reject(
        "Invalid orderDetails - must have an email and either a shipping_address or shipping_address_id"
      );
    }
  }

  payment(paymentDetails) {
    const {order_id, stripe_token} = paymentDetails;
    if (order_id && stripe_token) {
      return this.authHeaders().then((headers) => this.api.request(`/orders/${order_id}/payments`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({stripe_token})
      }));
    } else {
      return Promise.reject(
        "Invalid paymentDetails - must have an order_id and a stripe_token"
      );
    }
  }

  orderHistory() {
    if (this.user) {
      return this.authHeaders().then((headers) => this.api.request("/orders", {
        headers
      }));
    } else {
      return Promise.reject(
        "You must be authenticated to fetch order history"
      );
    }
  }

  authHeaders() {
    if (this.user) {
      return this.user.jwt().then((token) => ({Authorization: `Bearer ${token}`}));
    }
    return Promise.resolve({});
  }

  loadCart() {
    const json = localStorage.getItem(cartKey);
    if (json) {
      this.cart = JSON.parse(json);
    } else {
      this.cart = {};
    }
  }

  persistCart() {
    const json = JSON.stringify(this.cart);
    localStorage.setItem(cartKey, json);
  }
}

if (typeof window !== "undefined") {
  window.Gocommerce = Gocommerce
}
