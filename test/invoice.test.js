'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

test('invoice uses the same HSN GST slab as checkout', function () {
  const order = {
    id: 1,
    items: [{ name: 'Rice', sku: 'RICE', hsn: '1006', price: 100, qty: 2 }],
    coupon: ''
  };

  const billed = pricing.computeTotals(order.items, order.coupon);
  const printed = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    {
      tax: printed.tax,
      cgst: printed.cgst,
      sgst: printed.sgst,
      total: printed.total,
      gstPercent: printed.rows[0].gstPercent,
      lineTax: printed.rows[0].lineTax
    },
    {
      tax: billed.tax,
      cgst: billed.cgst,
      sgst: billed.sgst,
      total: billed.total,
      gstPercent: billed.lines[0].gstPercent,
      lineTax: billed.lines[0].tax
    }
  );
});

test('invoice uses the checkout coupon cap and post-discount GST calculation', function () {
  const items = [{ name: 'Tea', hsn: '0902', price: 2000, qty: 1 }];
  const order = { id: 2, items: items, coupon: 'SAVE10' };

  const billed = pricing.computeTotals(items, order.coupon);
  const printed = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    { discount: printed.discount, tax: printed.tax, total: printed.total },
    { discount: billed.discount, tax: billed.tax, total: billed.total }
  );
});

test('invoice follows checkout coupon eligibility rules', function () {
  const items = [{ name: 'Tea', hsn: '0902', price: 100, qty: 1 }];
  const order = { id: 3, items: items, coupon: 'DIWALI20' };

  const billed = pricing.computeTotals(items, order.coupon);
  const printed = invoice.computeInvoiceFigures(order);

  assert.equal(billed.discount, 0);
  assert.deepEqual(
    { discount: printed.discount, tax: printed.tax, total: printed.total },
    { discount: billed.discount, tax: billed.tax, total: billed.total }
  );
});

test('rendered invoice matches the stored billed total without a mismatch notice', function () {
  const html = invoice.render({
    id: 4,
    date: '22/11/2026',
    status: 'completed',
    customer: 'Walk-in',
    paymentMode: 'cash',
    items: [{ name: 'Rice', sku: 'RICE', hsn: '1006', price: 100, qty: 2 }],
    coupon: '',
    total: 210
  });

  assert.match(html, /Invoice Total<\/td><td class="r">₹210\.00/);
  assert.match(html, /₹210\.00/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

test('invoice figures match pricing totals across mixed HSN lines and a coupon', function () {
  const items = [
    { id: 1, name: 'Rice', hsn: '1006', price: 640, qty: 1 },
    { id: 8, name: 'Tea', hsn: '0902', price: 140, qty: 1 }
  ];
  const coupon = 'WELCOME';
  const order = { id: 5, items: items, coupon: coupon };
  const billed = pricing.computeTotals(items, coupon);
  const printed = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    {
      subtotal: printed.subtotal,
      discount: printed.discount,
      tax: printed.tax,
      cgst: printed.cgst,
      sgst: printed.sgst,
      total: printed.total
    },
    {
      subtotal: billed.subtotal,
      discount: billed.discount,
      tax: billed.tax,
      cgst: billed.cgst,
      sgst: billed.sgst,
      total: billed.total
    }
  );
});
