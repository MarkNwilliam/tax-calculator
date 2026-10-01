'use strict';

/**
 * Tax Calculator HTTP service.
 *
 * Kept deliberately thin: every decision lives in lib/tax.js so it can be
 * unit tested without a server, and the Tekton unit-test task can run the
 * same specs that developers run locally.
 */

const path = require('path');
const express = require('express');
const tax = require('./lib/tax');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/** Liveness probe used by the container HEALTHCHECK and by Tekton. */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'tax-calculator', version: require('./package.json').version });
});

/** The bracket table, so the UI never hard-codes rates. */
app.get('/api/brackets', (req, res) => {
  res.json({ currency: 'USD', brackets: tax.TAX_BRACKETS });
});

app.post('/api/calculate', (req, res) => {
  const body = req.body || {};
  try {
    const result = tax.calculateTakeHome({
      grossIncome: body.grossIncome,
      deductions: body.deductions,
      vatAmount: body.vatAmount,
      vatRate: body.vatRate === undefined || body.vatAmount === undefined || body.vatAmount === ''
        ? undefined
        : body.vatRate
    });

    // Skip VAT entirely when no spend was entered.
    if (body.vatAmount === undefined || body.vatAmount === '') {
      delete result.vat;
    }

    res.json(Object.assign({ ok: true }, result));
  } catch (err) {
    const status = err instanceof RangeError ? 400 : 422;
    res.status(status).json({ ok: false, error: err.message });
  }
});

app.get('/api/tax/:income', (req, res) => {
  try {
    const income = Number(req.params.income);
    res.json({ ok: true, taxableIncome: income, incomeTax: tax.federalIncomeTax(income) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('tax-calculator listening on port ' + PORT);
  });
}

module.exports = app;