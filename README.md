# GoCommerce JS

This is a JS client library for [GoCommerce](https://github.com/netlify/gocommerce) API.

**IMPORTANT:** This requires at least version 1.8.0 of the GoCommerce backend (since v5.0.0).

It handles orders and payments. Integrates with Stripe for payments and will support international pricing and VAT verification.

## Usage

```js
import GoCommerce from "gocommerce-js";

const commerce = new GoCommerce({
  APIUrl: "https://commerce.netlify.com"
});

commerce.addToCart({
	path: "/products/book-1/",
	quantity: 2,
	meta: {
    // You can add anything in metadata and use it in your checkout ui
		photo: "/images/mugs/netlig-01.png"
	}
}).then((lineItem) => console.log(lineItem));

console.log(commerce.getCart());
/*
{
  items: [{
  	title: "Netlify Mug",
  	sku: "netlify-mug-01",
  	description: "A mug with a netlify sticker!",
  	price: {amount: "49.00", "currency": "USD", cents: 4900},
    tax: {amount: "0.00", currency: "USD", cents: 0},
  	quantity: 2,
  	metadata: {
  		photo: "/images/mugs/netlig-01.png" // You can add anything in metadata
  	}
  }],
  subtotal: {amount: "98.00", "currency": "USD", cents: 9800},
  taxes: {amount: "0.00", "currency": "USD", cents: 0},
  total: {amount: "98.00", "currency": "USD", cents: 9800}
}
*/

commerce.updateCart("netlify-mug-01", 3); // Set to 0 to remove

commerce.order({
  email: "matt@netlify.com",
  shipping_address: {
    name: "Matt Biilmann",
    company: "netlify", // Optional
    address1: "610 22nd Street",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    zip: "94107"
  }
  /* You can optionally specify billing_address as well */
}).then(({cart, order}) => {
  return commerce.payment({
    // Get a token from Stripes button or a custom integration
    "provider": "stripe",
    "stripe_token": TOKEN_FROM_STRIPE_CC_FORM,
    // The commerce API will verify that the amount and order ID match
    "amount": cart.total.cents,
    "order_id": order.id,
  })
}).then((transaction) => {
  console.log("Order confirmed!")
});

commerce.clearCart(); // Will be called automatically after a successful order
```

You can change country (for VAT calculations) or currency at any time:

```js
commerce.setCountry("USA");
commerce.setCurrency("USD");
```

You can use GoCommerce JS together with [GoTrue](https://github.com/netlify/gotrue) to let users log in and claim view order history.

```js
goTrue.login(email, password).then((user) => {
  commerce.setUser(user);

  commerce.order({
    email: user.email,
    shipping_address_id: "some-previously-generated-address"
    /* Normal order details */
  });

  commerce.orderHistory().then((orders) => {
    console.log(orders);
  });
});
```
