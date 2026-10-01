/*
 * Tax Calculator - DOM wiring.
 *
 * All arithmetic lives in taxCalculator.js; this file only reads the form,
 * calls it, and renders the result.
 */
(function () {
  'use strict';

  var form   = document.getElementById('tax-form');
  var error  = document.getElementById('error');
  var results = document.getElementById('results');

  var fields = {
    grossIncome: document.getElementById('gross-income'),
    deductions:  document.getElementById('deductions'),
    vatBase:     document.getElementById('vat-base'),
    vatRate:     document.getElementById('vat-rate')
  };

  var out = {
    taxable: document.getElementById('r-taxable'),
    tax:     document.getElementById('r-tax'),
    rate:    document.getElementById('r-rate'),
    vat:     document.getElementById('r-vat'),
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
    out.tax.textContent     = taxCalculator.formatCurrency(r.incomeTax);
    out.rate.textContent    = r.effectiveRate.toFixed(2) + '%';
    out.vat.textContent     = taxCalculator.formatCurrency(r.vat);
    out.take.textContent    = taxCalculator.formatCurrency(r.takeHome);
    results.hidden = false;
  }

  function calculate(event) {
    if (event) event.preventDefault();
    try {
      var result = taxCalculator.calculateTakeHome({
        grossIncome: num(fields.grossIncome, 'Gross income'),
        deductions:  num(fields.deductions,  'Deductions'),
        vatBase:     num(fields.vatBase,     'VAT-able spend'),
        vatRate:     num(fields.vatRate,     'VAT rate') / 100
      });
      clearError();
      render(result);
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