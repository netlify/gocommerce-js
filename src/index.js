import API from "./api";

const HTTPRegexp = /^http:\/\//;
const cartKey = "gocommerce.shopping-cart";

function checkRole(user, role) {
  return user && user.roles && user.roles.filter((r) => r == role)[0];
}

function getPrice(prices, currency, user) {
  return prices
    .filter((price) => currency == (price.currency || "USD").toUpperCase())
    .filter((price) => price.role ? checkRole(user) : true)
    .sort((a, b) => a.amount - b.amount)[0];
}

export default class Gocommerce {
  constructor(options) {
    if (!options.APIUrl) {
      throw("You must specify an APIUrl of your Gocommerce instance");
    }
    if (options.APIUrl.match(HTTPRegexp)) {
      console.log('Warning:\n\nDO NOT USE HTTP IN PRODUCTION FOR GOCOMMERCE EVER!\GOCOMMERCE REQUIRES HTTPS to work securely.')
    }

    this.api = new API(options.APIUrl);
    this.currency = "USD";
    this.loadCart();
  }

  setUser(user) {
    this.user = user;
  }

  addToCart(item) {
    const {path, quantity, meta} = item;
    if (quantity && path) {
      return fetch(path).then((response) => {
        if (!response.ok) { return Promise.reject(`Failed to fetch ${path}`); }

        return response.text().then((html) => {
          const doc = document.implementation.createHTMLDocument("product");
          doc.documentElement.innerHTML = html;
          const product = JSON.parse(doc.getElementById("gocommerce-product").innerHTML);
          const {sku, title, prices, description, type, vat} = product;
          if (sku && title && prices) {
            if (this.cart[sku]) {
              this.cart[sku].quantity += quantity;
            } else {
              this.cart[sku] = Object.assign(product, {path, meta, quantity});
            }
            this.persistCart();
            return this.getCart();
          } else {
            return Promise.reject("Failed to read sku, title and price from product path");
          }
        });
      });
    } else {
      return Promise.reject("Invalid item - must have path and quantity");
    }
  }

  getCart() {
    const cart = {total: {amount: "", cents: 0, currency: this.currency}, items: {}};
    console.log(this.cart);
    for (const key in this.cart) {
      cart.items[key] = Object.assign({}, this.cart[key], {
        price: getPrice(this.cart[key].prices, this.currency, this.user)
      });
      cart.total.cents += parseFloat(cart.items[key].price.amount * 100);
    }
    cart.total.amount = `${(cart.total.cents / 100).toFixed(2)}`;
    return cart;
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
    const {order_id, amount, stripe_token} = paymentDetails;
    if (order_id && stripe_token && amount) {
      const cart = this.getCart();
      return this.authHeaders().then((headers) => this.api.request(`/orders/${order_id}/payments`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          amount,
          order_id,
          stripe_token,
          currency: this.currency
        })
      }));
    } else {
      return Promise.reject(
        "Invalid paymentDetails - must have an order_id, an amount and a stripe_token"
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
