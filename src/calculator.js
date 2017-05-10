class Price {
  constructor() {
    this.subtotal = 0;
    this.discount = 0;
    this.taxes = 0;
    this.total = 0;
  }
}

function findTax(settings, country, type) {
  if (settings && settings.taxes) {
    for (const i in settings.taxes) {
      const tax = settings.taxes[i];
      if (
        (tax.countries == null || tax.countries.indexOf(country) > -1) &&
        (tax.product_types == null || tax.product_types.indexOf(type) > -1)
      ) {
        return tax;
      }
    }
  }
  return null;
}

function couponValidFor(coupon, item) {
  if (coupon.product_types && coupon.product_types.length) {
    return coupon.product_types.indexOf(item.type) > -1;
  }
  return true;
}

export function calculatePrices(settings, claims, country, currency, coupon, items) {
  const price = new Price();
  const includeTaxes = settings && settings.prices_include_taxes;
  price.items = [];
  items && items.forEach((item) => {
    const itemPrice = new Price();
    itemPrice.quantity = item.quantity || 1;
    itemPrice.subtotal = item.price.cents + (item.addonPrice ? item.addonPrice.cents : 0);

    const taxAmounts = [];
    if (item.vat) {
      taxAmounts.push({price: itemPrice.subtotal, percentage: item.vat});
    } else if (settings && item.price.items && item.price.items.length) {
      item.price.items.forEach((priceItem) => {
        const tax = findTax(settings, country, priceItem.type);
        if (tax) {
          taxAmounts.push({price: priceItem.cents, percentage: tax.percentage});
        }
      });
    } else {
      const tax = findTax(settings, country, item.type);
      if (tax) {
        taxAmounts.push({price: itemPrice.subtotal, percentage: tax.percentage});
      }
    }

    if (taxAmounts.length) {
      if (includeTaxes) {
        itemPrice.subtotal = 0;
      }
      taxAmounts.forEach((tax) => {
        if (includeTaxes) {
          tax.price = Math.round(tax.price / (100 + tax.percentage) * 100);
          itemPrice.subtotal += tax.price;
        }
        itemPrice.taxes += Math.round(tax.price * tax.percentage / 100);
      });
    }

    if (coupon && couponValidFor(coupon, item)) {
      const amountToDiscount = includeTaxes ? itemPrice.subtotal + itemPrice.taxes : itemPrice.subtotal;
      itemPrice.discount = Math.round(amountToDiscount * coupon.percentage / 100);
    }

    itemPrice.total = itemPrice.subtotal - itemPrice.discount + itemPrice.taxes;
    price.items.push(itemPrice);

    price.subtotal += (itemPrice.subtotal * itemPrice.quantity);
    price.discount += (itemPrice.discount * itemPrice.quantity);
    price.taxes    += (itemPrice.taxes    * itemPrice.quantity);
    price.total    += (itemPrice.total    * itemPrice.quantity);
  });

  return price;
}
