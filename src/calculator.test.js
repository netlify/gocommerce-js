import { calculatePrices } from "./calculator";

const defaultCoupon = { percentage: 10, product_types: ["test"] };
const validateDefaultCouponOnly = item => {
  expect(item.couponDiscount).toBe(item.discount);
  expect(item.memberDiscount).toBe(0);
  expect(item.discountItems).toHaveLength(1);
  const [firstDiscount] = item.discountItems;
  expect(firstDiscount.type).toBe("coupon");
  expect(firstDiscount.percentage).toBe(10);
  expect(firstDiscount.fixed).toBe(0);
};

test("no items", () => {
  const price = calculatePrices(null, null, "USA", "USD", null, []);
  expect(price.total).toBe(0);
  expect(price.items).toHaveLength(0);
});

test("no taxes", () => {
  const price = calculatePrices(null, null, "USA", "USD", null, [{ price: { cents: 100 }, type: "test" }]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(0);
  expect(price.discount).toBe(0);
  expect(price.netTotal).toBe(100);
  expect(price.total).toBe(100);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(100);
  expect(firstItem.taxes).toBe(0);
});

test("fixed vat", () => {
  const price = calculatePrices(null, null, "USA", "USD", null, [{ price: { cents: 100 }, vat: 9, type: "test" }]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(9);
  expect(price.discount).toBe(0);
  expect(price.netTotal).toBe(100);
  expect(price.total).toBe(109);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(109);
  expect(firstItem.taxes).toBe(9);
});

test("fixed vat when prices include taxes", () => {
  const price = calculatePrices({ prices_include_taxes: true }, null, "USA", "USD", null, [
    { price: { cents: 100 }, vat: 9, type: "test" },
  ]);
  expect(price.subtotal).toBe(92);
  expect(price.taxes).toBe(8);
  expect(price.discount).toBe(0);
  expect(price.netTotal).toBe(92);
  expect(price.total).toBe(100);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(100);
  expect(firstItem.taxes).toBe(8);
});

test("fixed vat when prices include taxes", () => {
  const price = calculatePrices({ prices_include_taxes: true }, null, "USA", "USD", null, [
    {
      price: { amount: "499", currency: "USD", cents: 49900 },
      vat: "20",
      type: "Ticket",
    },
  ]);
  expect(price.subtotal).toBe(41583);
  expect(price.taxes).toBe(8317);
  expect(price.discount).toBe(0);
  expect(price.netTotal).toBe(41583);
  expect(price.total).toBe(49900);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(49900);
  expect(firstItem.taxes).toBe(8317);
});

test("fixed vat when prices include taxes for a real example", () => {
  const price = calculatePrices(
    {
      taxes: [{ percentage: 7, product_types: ["book"], countries: ["Netherlands"] }],
      prices_include_taxes: true,
    },
    null,
    "Netherlands",
    "EUR",
    null,
    [{ price: { cents: 2900 }, type: "book" }]
  );
  expect(price.subtotal).toBe(2710);
  expect(price.taxes).toBe(190);
  expect(price.discount).toBe(0);
  expect(price.netTotal).toBe(2710);
  expect(price.total).toBe(2900);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(2900);
  expect(firstItem.taxes).toBe(190);
  expect(firstItem.discount).toBe(0);
  expect(firstItem.discountItems).toHaveLength(0);
});

test("country based VAT", () => {
  const settings = {
    taxes: [{ percentage: 21, product_types: ["test"], countries: ["USA"] }],
  };
  const price = calculatePrices(settings, null, "USA", "USD", null, [{ price: { cents: 100 }, type: "test" }]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(21);
  expect(price.discount).toBe(0);
  expect(price.netTotal).toBe(100);
  expect(price.total).toBe(121);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(121);
  expect(firstItem.taxes).toBe(21);
});

test("country based VAT when prices include taxes", () => {
  const settings = {
    prices_include_taxes: true,
    taxes: [{ percentage: 21, product_types: ["test"], countries: ["USA"] }],
  };
  const price = calculatePrices(settings, null, "USA", "USD", null, [{ price: { cents: 100 }, type: "test" }]);
  expect(price.subtotal).toBe(83);
  expect(price.taxes).toBe(17);
  expect(price.discount).toBe(0);
  expect(price.netTotal).toBe(83);
  expect(price.total).toBe(100);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(100);
  expect(firstItem.taxes).toBe(17);
});

test("coupon with no taxes", () => {
  const price = calculatePrices(null, null, "USA", "USD", defaultCoupon, [{ price: { cents: 100 }, type: "test" }]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(0);
  expect(price.discount).toBe(10);
  expect(price.netTotal).toBe(90);
  expect(price.total).toBe(90);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(90);
  expect(firstItem.discount).toBe(10);
  validateDefaultCouponOnly(firstItem);
});

test("coupon with vat", () => {
  const price = calculatePrices(null, null, "USA", "USD", defaultCoupon, [
    { price: { cents: 100 }, vat: 10, type: "test" },
  ]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(9);
  expect(price.discount).toBe(10);
  expect(price.netTotal).toBe(90);
  expect(price.total).toBe(99);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(99);
  expect(firstItem.discount).toBe(10);
  validateDefaultCouponOnly(firstItem);
});

test("coupon with vat when prices include taxes", () => {
  const price = calculatePrices({ prices_include_taxes: true }, null, "USA", "USD", defaultCoupon, [
    { price: { cents: 100 }, vat: 9, type: "test" },
  ]);
  expect(price.subtotal).toBe(92);
  expect(price.taxes).toBe(7);
  expect(price.discount).toBe(10);
  expect(price.netTotal).toBe(83);
  expect(price.total).toBe(90);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(90);
  expect(firstItem.discount).toBe(10);
  validateDefaultCouponOnly(firstItem);
});

test("pricing items", () => {
  const settings = {
    taxes: [
      {
        percentage: 7,
        product_types: ["book"],
        countries: ["DE"],
      },
      {
        percentage: 21,
        product_types: ["ebook"],
        countries: ["DE"],
      },
    ],
  };
  const price = calculatePrices(settings, null, "DE", "EUR", null, [
    {
      price: {
        cents: 100,
        items: [{ cents: 80, type: "book" }, { cents: 20, type: "ebook" }],
      },
      type: "book",
    },
  ]);
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(10);
  expect(price.discount).toBe(0);
  expect(price.netTotal).toBe(100);
  expect(price.total).toBe(110);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(110);
  expect(firstItem.taxes).toBe(10);
  expect(firstItem.discount).toBe(0);
  expect(firstItem.discountItems).toHaveLength(0);
});

test("quantity", () => {
  const price = calculatePrices(null, null, "USA", "USD", defaultCoupon, [
    { price: { cents: 100 }, quantity: 2, vat: 9, type: "test" },
  ]);
  expect(price.subtotal).toBe(200);
  expect(price.taxes).toBe(16);
  expect(price.discount).toBe(20);
  expect(price.netTotal).toBe(180);
  expect(price.total).toBe(196);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(98);
  expect(firstItem.quantity).toBe(2);
  expect(firstItem.discount).toBe(10);
  validateDefaultCouponOnly(firstItem);
});

test("member discounts", () => {
  const settings = {
    member_discounts: [
      {
        claims: { "app_metadata.subscriptions.members": "supporter" },
        percentage: 10,
      },
    ],
  };
  const price = calculatePrices(
    settings,
    { app_metadata: { subscriptions: { members: "supporter" } } },
    "USA",
    "USD",
    null,
    [{ price: { cents: 100 }, type: "test" }]
  );
  expect(price.subtotal).toBe(100);
  expect(price.taxes).toBe(0);
  expect(price.discount).toBe(10);
  expect(price.netTotal).toBe(90);
  expect(price.total).toBe(90);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(90);
  expect(firstItem.discount).toBe(10);
  expect(firstItem.couponDiscount).toBe(0);
  expect(firstItem.memberDiscount).toBe(10);
  expect(firstItem.discountItems).toHaveLength(1);
  const [firstDiscount] = firstItem.discountItems;
  expect(firstDiscount.type).toBe("member");
  expect(firstDiscount.percentage).toBe(10);
  expect(firstDiscount.fixed).toBe(0);
});

test("fixed member discounts", () => {
  const settings = {
    member_discounts: [
      {
        claims: { "app_metadata.subscription.plan": "member" },
        fixed: [{ amount: "15.00", currency: "USD" }, { amount: "15.00", currency: "EUR" }],
        product_types: ["Book"],
      },
    ],
  };
  const price = calculatePrices(settings, { app_metadata: { subscription: { plan: "member" } } }, "USA", "USD", null, [
    { price: { cents: 2490 }, type: "Book" },
  ]);
  expect(price.subtotal).toBe(2490);
  expect(price.taxes).toBe(0);
  expect(price.discount).toBe(1500);
  expect(price.netTotal).toBe(990);
  expect(price.total).toBe(990);

  // items
  expect(price.items).toHaveLength(1);
  const [firstItem] = price.items;
  expect(firstItem.total).toBe(990);
  expect(firstItem.discount).toBe(1500);
  expect(firstItem.couponDiscount).toBe(0);
  expect(firstItem.memberDiscount).toBe(1500);
  expect(firstItem.discountItems).toHaveLength(1);
  const [firstDiscount] = firstItem.discountItems;
  expect(firstDiscount.type).toBe("member");
  expect(firstDiscount.percentage).toBe(0);
  expect(firstDiscount.fixed).toBe(1500);
});

test("fixed member discounts", () => {
  const settings = {
    member_discounts: [
      {
        claims: { "app_metadata.subscription.plan": "member" },
        fixed: [{ amount: "15.00", currency: "USD" }, { amount: "15.00", currency: "EUR" }],
        products: ["best-book-ever"],
      },
    ],
  };
  const price = calculatePrices(settings, { app_metadata: { subscription: { plan: "member" } } }, "USA", "USD", null, [
    { price: { cents: 2490 }, type: "Book", sku: "best-book-ever" },
  ]);
  expect(price.subtotal).toBe(2490);
  expect(price.taxes).toBe(0);
  expect(price.discount).toBe(1500);
  expect(price.netTotal).toBe(990);
  expect(price.total).toBe(990);
});

test("real world tax calculation", () => {
  const settings = {
    prices_include_taxes: true,
    taxes: [
      {
        percentage: 7,
        product_types: "book",
        countries: "USA",
      },
      {
        percentage: 19,
        product_types: "ebook",
        countries: "USA",
      },
    ],
  };

  const firstItem = {
    price: {
      cents: 2900,
      items: [{ cents: 1900, type: "book" }, { cents: 1000, type: "ebook" }],
    },
    type: "book",
  };
  const secondItem = {
    price: {
      cents: 3490,
      items: [{ cents: 2300, type: "book" }, { cents: 1190, type: "ebook" }],
    },
    type: "book",
  };

  const price = calculatePrices(settings, null, "USA", "USD", null, [firstItem, secondItem]);
  expect(price.subtotal).toBe(5766);
  expect(price.taxes).toBe(624);
  expect(price.discount).toBe(0);
  expect(price.netTotal).toBe(5766);
  expect(price.total).toBe(6390);

  // items
  expect(price.items).toHaveLength(2);
  const [firstPrice, secondPrice] = price.items;
  expect(firstPrice.total).toBe(2900);
  expect(firstPrice.taxes).toBe(284);
  expect(secondPrice.total).toBe(3490);
  expect(secondPrice.taxes).toBe(340);
});

test("real world relative discount with taxes", () => {
  const settings = {
    prices_include_taxes: true,
    taxes: [
      {
        percentage: 7,
        product_types: "book",
        countries: "USA",
      },
      {
        percentage: 19,
        product_types: "ebook",
        countries: "USA",
      },
    ],
  };

  const firstItem = {
    price: {
      cents: 3900,
      items: [{ cents: 2900, type: "book" }, { cents: 1000, type: "ebook" }],
    },
    type: "book",
  };

  const price = calculatePrices(settings, null, "USA", "USD", { percentage: 25, product_types: ["book"] }, [firstItem]);
  expect(price.subtotal).toBe(3550);
  expect(price.taxes).toBe(262);
  expect(price.discount).toBe(975);
  expect(price.netTotal).toBe(2663);
  expect(price.total).toBe(2925);

  // items
  expect(price.items).toHaveLength(1);
  const [firstPrice] = price.items;
  expect(firstPrice.total).toBe(2925);
  expect(firstPrice.discount).toBe(975);
  expect(firstPrice.couponDiscount).toBe(975);
  expect(firstPrice.memberDiscount).toBe(0);
  expect(firstPrice.discountItems).toHaveLength(1);
  const [firstDiscount] = firstPrice.discountItems;
  expect(firstDiscount.type).toBe("coupon");
  expect(firstDiscount.percentage).toBe(25);
  expect(firstDiscount.fixed).toBe(0);
});

test("real world fixed member discount with taxes", () => {
  const settings = {
    prices_include_taxes: true,
    taxes: [
      {
        percentage: 7,
        product_types: "book",
        countries: "USA",
      },
      {
        percentage: 19,
        product_types: "ebook",
        countries: "USA",
      },
    ],
    member_discounts: [
      {
        claims: { "app_metadata.subscription.plan": "member" },
        fixed: [{ amount: "10.00", currency: "USD" }],
        product_types: ["book"],
      },
    ],
  };

  const firstItem = {
    price: {
      cents: 3900,
      items: [{ cents: 2900, type: "book" }, { cents: 1000, type: "ebook" }],
    },
    type: "book",
  };

  const price = calculatePrices(settings, { app_metadata: { subscription: { plan: "member" } } }, "USA", "USD", null, [
    firstItem,
  ]);
  expect(price.subtotal).toBe(3550);
  expect(price.taxes).toBe(260);
  expect(price.discount).toBe(1000);
  expect(price.netTotal).toBe(2640);
  expect(price.total).toBe(2900);

  // items
  expect(price.items).toHaveLength(1);
  const [firstPrice] = price.items;
  expect(firstPrice.total).toBe(2900);
  expect(firstPrice.discount).toBe(1000);
  expect(firstPrice.couponDiscount).toBe(0);
  expect(firstPrice.memberDiscount).toBe(1000);
  expect(firstPrice.discountItems).toHaveLength(1);
  const [firstDiscount] = firstPrice.discountItems;
  expect(firstDiscount.type).toBe("member");
  expect(firstDiscount.percentage).toBe(0);
  expect(firstDiscount.fixed).toBe(1000);
});

describe("tax rounding test for mixed tax types", () => {
  const settings = {
    prices_include_taxes: true,
    taxes: [
      {
        percentage: 21,
        product_types: ["E-Book", "Webinar", "Bundle", "Job Post"],
        countries: ["Belgium", "Latvia", "Lithuania", "Netherlands", "Czech Republic", "Czech", "Spain"],
      },
      {
        percentage: 7,
        product_types: ["Book"],
        countries: [
          "Austria",
          "Belgium",
          "Bulgaria",
          "Croatia",
          "Cyprus",
          "Czech Republic",
          "Czech",
          "Denmark",
          "Estonia",
          "Finland",
          "France",
          "Germany",
          "Gibraltar",
          "Greece",
          "Hungary",
          "Ireland",
          "Italy",
          "Latvia",
          "Lithuania",
          "Luxembourg",
          "Malta",
          "Netherlands",
          "Poland",
          "Portugal",
          "Romania",
          "Slovakia",
          "Slovenia",
          "Spain",
          "Sweden",
          "United Kingdom",
        ],
      },
    ],
    member_discounts: [
      {
        claims: {
          "app_metadata.subscription.plan": "smashing",
        },
        fixed: [
          {
            amount: "10.00",
            currency: "USD",
          },
          {
            amount: "10.00",
            currency: "EUR",
          },
        ],
        product_types: ["Book"],
      },
    ],
    ts: 1553710078768,
  };

  const item = {
    currency: "EUR",
    id: "art-direction-for-the-web3",
    sku: "art-direction-for-the-web",
    type: "Book",
    price: {
      amount: "29.00",
      currency: "EUR",
      items: [
        {
          amount: "19.00",
          type: "Book",
          cents: "1900",
        },
        {
          amount: "10.00",
          type: "E-Book",
          cents: "1000",
        },
      ],
      cents: 2900,
    },
    sales_price: "29.00",
    prices: [
      {
        amount: "39.00",
        currency: "USD",
        items: [
          {
            amount: "30.00",
            type: "Book",
          },
          {
            amount: "9.00",
            type: "E-Book",
          },
        ],
      },
      {
        amount: "39.00",
        currency: "EUR",
        items: [
          {
            amount: "30.00",
            type: "Book",
          },
          {
            amount: "9.00",
            type: "E-Book",
          },
        ],
        cents: 3900,
      },
      {
        amount: "29.00",
        currency: "USD",
        items: [
          {
            amount: "19.00",
            type: "Book",
          },
          {
            amount: "10.00",
            type: "E-Book",
          },
        ],
      },
      {
        amount: "29.00",
        currency: "EUR",
        items: [
          {
            amount: "19.00",
            type: "Book",
            cents: "1900",
          },
          {
            amount: "10.00",
            type: "E-Book",
            cents: "1000",
          },
        ],
        cents: 2900,
      },
    ],
    newPrice: 2900,
  };

  test("with member discount", () => {
    const price = calculatePrices(
      settings,
      { app_metadata: { subscription: { plan: "smashing" } } },
      "Netherlands",
      "EUR",
      null,
      [item]
    );
    expect(price.total).toBe(1900);
  });

  test("without discount", () => {
    const price = calculatePrices(settings, null, "Netherlands", "EUR", null, [item]);
    expect(price.total).toBe(2900);
  });
});
