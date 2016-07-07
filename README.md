# Gocommerce JS Client

This is a JS library for the [Gocommerce](https://github.com/netlify/gocommerce) API.

It lets you signup and authenticate users and is a building block for constructing
the UI for signups, password recovery, login and logout.

## Usage

```js
import Gocommerce from `gocommerce-js`;

const gocommerce = new Gocommerce({
  APIUrl: "https://gocommerce.netlify.com"
});

gocommerce.addToCart({
	title: "Netlify Mug",
	sku: "netlify-mug-01",
	description: "A mug with a netlify sticker!",
	price: 4900, // Price should always be in cents
	quantity: 2,
	meta: {
		photo: "/images/mugs/netlig-01.png" // You can add anything in metadata
	}
});

console.log(gocommerce.getCart());
/*
  [{
  	title: "Netlify Mug",
  	sku: "netlify-mug-01",
  	description: "A mug with a netlify sticker!",
  	price: 4900, // Price should always be in cents
  	quantity: 2,
  	metadata: {
  		photo: "/images/mugs/netlig-01.png" // You can add anything in metadata
  	}
  }]
*/

gocommerce.updateCard("netlify-mug-01", 3); // Set to 0 to remove

gocommerce.order({
  email: "matt@netlify.com",
  shipping_address: {
    first_name: "Matt",
    last_name: "Biilmann",
    company: "netlify", // Optional
    address: "610 22nd Street",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    zip: "94107"
  }
  /* You can optionally specify billing_address as well */
}).then((order) => {
  return gocommerce.payment({
    "order_id": order.id,
    "stripe_token": TOKEN_FROM_STRIPE_CC_FORM
  })
}).then((transaction) => {
  console.log("Order confirmed!")
});

gocommerce.clearCart(); // Will be called automatically after a successful order
```

You can use `gocommerce` together with [authlify](https://github.com/netlify/authlify) to let users log in and claim view order history.

```js
authlify.login(email, password).then((user) => {
  gocommerce.setUser(user);

  gocommerce.order({
    email: user.email,
    shipping_address_id: "some-previously-generated-address"
    /* Normal order details */
  });

  gocommerce.orderHistory().then((orders) => {
    console.log(orders);
  });
});
```
