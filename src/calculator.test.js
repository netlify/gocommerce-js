import {calculatePrices} from './calculator';

test('no items', () => {
  const price = calculatePrices(null, null, "USA", "USD", null, []);
  expect(price.total).toBe(0);
});

test('no taxes', () => {
  const price = calculatePrices(null, null, "USA", "USD", null, [{price: {cents: 100}, type: "test"}]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(0);
  expect(price.discount).toBe(0);
  expect(price.total).toBe(100);
});

test('fixed vat', () => {
  const price = calculatePrices(null, null, "USA", "USD", null, [{price: {cents: 100}, vat: 9, type: "test"}]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(9);
  expect(price.discount).toBe(0);
  expect(price.total).toBe(109);
})

test('fixed vat when prices include taxes', () => {
  const price = calculatePrices({prices_include_taxes: true}, null, "USA", "USD", null, [{price: {cents: 100}, vat: 9, type: "test"}]);
  expect(price.subtotal).toBe(92);
  expect(price.taxes).toBe(8);
  expect(price.discount).toBe(0);
  expect(price.total).toBe(100);
});

test('country based VAT', () => {
  const settings = {taxes: [{percentage: 21, product_types: ["test"], countries: ["USA"]}]};
  const price = calculatePrices(settings, null, "USA", "USD", null, [{price: {cents: 100}, type: "test"}]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(21);
  expect(price.discount).toBe(0);
  expect(price.total).toBe(121);
});

test('country based VAT when prices include taxes', () => {
  const settings = {prices_include_taxes: true, taxes: [{percentage: 21, product_types: ["test"], countries: ["USA"]}]};
  const price = calculatePrices(settings, null, "USA", "USD", null, [{price: {cents: 100}, type: "test"}]);
  expect(price.subtotal).toBe(83);
  expect(price.taxes).toBe(17);
  expect(price.discount).toBe(0);
  expect(price.total).toBe(100);
});

test('coupon with no taxes', () => {
  const price = calculatePrices(null, null, "USA", "USD", {percentage: 10, product_types: ["test"]}, [{price: {cents: 100}, type: "test"}]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(0);
  expect(price.discount).toBe(10);
  expect(price.total).toBe(90);
});

test('coupon with vat', () => {
  const price = calculatePrices(null, null, "USA", "USD", {percentage: 10, product_types: ["test"]}, [{price: {cents: 100}, vat: 9, type: "test"}]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(9);
  expect(price.discount).toBe(10);
  expect(price.total).toBe(99);
});

test('coupon with vat when prices include taxes', () => {
  const price = calculatePrices({prices_include_taxes: true}, null, "USA", "USD", {percentage: 10, product_types: ["test"]}, [{price: {cents: 100}, vat: 9, type: "test"}]);
  expect(price.subtotal).toBe(92);
  expect(price.taxes).toBe(8);
  expect(price.discount).toBe(10);
  expect(price.total).toBe(90);
});

test('pricing items', () => {
  const settings = {
    taxes: [{
      percentage: 7,
      product_types: ["book"],
      countries: ["DE"]
    }, {
      percentage: 21,
      product_types: ["ebook"],
      countries: ["DE"]
    }]
  };
  const price = calculatePrices(settings, null, "DE", "EUR", null, [{
    price: {cents: 100, items: [{cents: 80, type: "book"}, {cents: 20, type: "ebook"}]},
    type: "book"
  }]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(10);
  expect(price.discount).toBe(0);
  expect(price.total).toBe(110);
});

test('quantity', () => {
  const price = calculatePrices(null, null, "USA", "USD", {percentage: 10, product_types: ["test"]}, [{price: {cents: 100}, quantity: 2, vat: 9, type: "test"}]);
  expect(price.subtotal).toBe(200);
  expect(price.taxes).toBe(18);
  expect(price.discount).toBe(20);
  expect(price.total).toBe(198);
});

test('member discounts', () => {
  const settings = {
    "member_discounts": [
      {
        "claims": {"app_metadata.subscriptions.members": "supporter"},
        "percentage": 10
      }
    ]
  };
  const price = calculatePrices(
    settings,
    {app_metadata: {subscriptions: {members: "supporter"}}},
    "USA", "USD", null,
    [{price: {cents: 100}, type: "test"}]
  );
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(0);
  expect(price.discount).toBe(10);
  expect(price.total).toBe(90);

});
