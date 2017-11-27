import {checkClaims} from './claims';

class Price {
  constructor() {
    this.subtotal = 0;
    this.discount = 0;
    this.couponDiscount = 0;
    this.memberDiscount = 0;
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

function couponValidFor(claims, coupon, item) {
  if (!checkClaims(claims, coupon.claims)) {
    return false;
  }
  if (coupon.product_types && coupon.product_types.length) {
    return coupon.product_types.indexOf(item.type) > -1;
  }
  if (coupon.products && coupon.products.length) {
    return coupon.products.indexOf(item.sku) > -1;
  }
  return true;
}

function fixedAmount(amounts, currency) {
  const fixed = amounts && amounts.filter((amount) => amount.currency === currency)[0];
  return (fixed && Math.round(parseFloat(fixed.amount) * 100)) || 0;
}

function calculateDiscount(amountToDiscount, taxes, percentage, fixed, includeTaxes) {
  let discount = 0;
	if (includeTaxes) {
		amountToDiscount = amountToDiscount + taxes;
	}
	if (percentage > 0) {
		discount = Math.round(amountToDiscount * percentage / 100);
	}
	discount += fixed;

	if (discount > amountToDiscount) {
		return amountToDiscount;
	}
	return discount;
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
      taxAmounts.push({price: itemPrice.subtotal, percentage: parseInt(item.vat, 10)});
    } else if (settings && item.price.items && item.price.items.length) {
      item.price.items.forEach((priceItem) => {
        const tax = findTax(settings, country, priceItem.type);
        taxAmounts.push({price: priceItem.cents, percentage: tax ? tax.percentage : 0});
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

    if (coupon && couponValidFor(claims, coupon, item)) {
      itemPrice.discount = calculateDiscount(
        itemPrice.subtotal, itemPrice.taxes, coupon.percentage, fixedAmount(coupon.fixed, currency), includeTaxes
      );
      itemPrice.couponDiscount = itemPrice.discount;
    }
    if (settings && settings.member_discounts) {
      settings.member_discounts.forEach((discount) => {
        if (couponValidFor(claims, discount, item)) {
          const memberDiscount = calculateDiscount(
            itemPrice.subtotal, itemPrice.taxes, discount.percentage, fixedAmount(discount.fixed, currency), includeTaxes
          );
          itemPrice.discount = itemPrice.discount || 0;
          itemPrice.discount += memberDiscount;
          itemPrice.memberDiscount = itemPrice.memberDiscount || 0;
          itemPrice.memberDiscount += memberDiscount;
        }
      });
    }

    itemPrice.total = Math.max(0, itemPrice.subtotal - itemPrice.discount + itemPrice.taxes);
    price.items.push(itemPrice);

    price.subtotal += (itemPrice.subtotal * itemPrice.quantity);
    price.discount += (itemPrice.discount * itemPrice.quantity);
    price.couponDiscount += (itemPrice.couponDiscount * itemPrice.quantity);
    price.memberDiscount += (itemPrice.memberDiscount * itemPrice.quantity);
    price.taxes    += (itemPrice.taxes    * itemPrice.quantity);
    price.total    += (itemPrice.total    * itemPrice.quantity);
  });

  return price;
}
