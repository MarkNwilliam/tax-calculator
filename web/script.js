/*
 * Tax Calculator - DOM wiring.
 *
 * All arithmetic lives in taxCalculator.js; this file only reads the form,
 * calls it, and renders the result.
 */
(function () {
  'use strict';

  var form    = document.getElementById('tax-form');
  var error   = document.getElementById('error');
  var results = document.getElementById('results');

  var fields = {
    grossIncome: document.getElementById('gross-income'),
    taxDue:     document.getElementById('tax-due'),
    deductions: document.getElementById('deductions'),
    vatBase:    document.getElementById('vat-base'),
    vatRate:    document.getElementById('vat-rate')
  };

  var out = {
    taxable: document.getElementById('r-taxable'),
    tax:     document.getElementById('r-tax'),
    vat:     document.getElementById('r-vat'),
    rate:    document.getElementById('r-rate'),
    take:    document.getElementById('r-take')
  };

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    results.hidden = true;
  }

  function clearError() {
    error.textContent = '';
    error.hidden = true;
  }

  function num(input, name) {
    var value = input.value === '' ? 0 : Number(input.value);
    if (!Number.isFinite(value)) throw new TypeError(name + ' must be a number');
    if (value < 0) throw new RangeError(name + ' must not be negative');
    return value;
  }

  function render(r) {
    out.taxable.textContent = taxCalculator.formatCurrency(r.taxableIncome);
    out.tax.textContent     = taxCalculator.formatCurrency(r.taxesOwed);
    out.vat.textContent     = taxCalculator.formatCurrency(r.vat);
    out.rate.textContent    = r.effectiveRate.toFixed(2) + '%';
    out.take.textContent    = taxCalculator.formatCurrency(r.takeHome);
    results.hidden = false;
  }

  function calculate(event) {
    if (event) event.preventDefault();
    try {
      var grossIncome = num(fields.grossIncome, 'Your Total Income');
      var taxDue      = num(fields.taxDue, 'Tax Due');
      var deductions  = num(fields.deductions, 'Deductions');

      var base = taxCalculator.calculateTakeHome({
        grossIncome: grossIncome,
        deductions:  deductions,
        vatBase:     num(fields.vatBase, 'VAT-able Spend'),
        vatRate:     num(fields.vatRate, 'VAT Rate') / 100
      });

      // "Tax Due" is any additional amount already assessed, so the Taxes
      // Owed figure is the calculated income tax plus that amount.
      var taxesOwed = taxCalculator.round2(base.incomeTax + taxDue);

      clearError();
      render({
        taxableIncome: base.taxableIncome,
        taxesOwed:     taxesOwed,
        vat:           base.vat,
        effectiveRate: base.effectiveRate,
        takeHome:      taxCalculator.round2(base.takeHome - taxDue)
      });
    } catch (e) {
      showError(e instanceof RangeError
        ? e.message + '. Enter zero or a positive amount.'
        : e.message + '. Please check the value entered.');
    }
  }

  form.addEventListener('submit', calculate);

  // Show a result immediately so the page is never blank on load.
  calculate();
}());