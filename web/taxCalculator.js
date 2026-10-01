/*
 * Tax Calculator - progressive federal income tax + VAT.
 *
 * Pure logic, no DOM. Loaded by script.js in the browser and requireable in
 * Node so the calculations can be verified without a browser:
 *
 *     const tax = require('./taxCalculator.js');
 *     tax.federalIncomeTax(50000);   // 6303.5
 *
 * Rates are the 2024 US federal single-filer brackets.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.taxCalculator = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BRACKETS = [
    { upTo: 11200,   rate: 0.10 },
    { upTo: 44725,   rate: 0.12 },
    { upTo: 95375,   rate: 0.22 },
    { upTo: 182100,  rate: 0.24 },
    { upTo: 231250,  rate: 0.32 },
    { upTo: 578125,  rate: 0.35 },
    { upTo: Infinity, rate: 0.37 }
  ];

  var STANDARD_DEDUCTION = 14600;
  var DEFAULT_VAT_RATE = 0.20;

  function assertAmount(value, name) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError(name + ' must be a number');
    }
    if (value < 0) {
      throw new RangeError(name + ' must not be negative');
    }
    return value;
  }

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  /* Progressive marginal tax: each slice of income is taxed at its own rate. */
  function federalIncomeTax(grossIncome, deductions) {
    assertAmount(grossIncome, 'grossIncome');
    var deduction = deductions === undefined ? STANDARD_DEDUCTION : assertAmount(deductions, 'deductions');
    var taxable = Math.max(0, grossIncome - deduction);
    var tax = 0;
    var floor = 0;

    for (var i = 0; i < BRACKETS.length; i++) {
      var ceiling = Math.min(taxable, BRACKETS[i].upTo);
      if (ceiling > floor) tax += (ceiling - floor) * BRACKETS[i].rate;
      floor = BRACKETS[i].upTo;
      if (taxable <= floor) break;
    }
    return round2(tax);
  }

  function calculateVat(amount, rate) {
    assertAmount(amount, 'amount');
    var r = rate === undefined ? DEFAULT_VAT_RATE : assertAmount(rate, 'rate');
    return round2(amount * r);
  }

  function calculateTakeHome(input) {
    var grossIncome = input && input.grossIncome;
    var deductions  = input && input.deductions;
    var vatBase     = input && input.vatBase;
    var vatRate     = input && input.vatRate;

    var incomeTax = federalIncomeTax(grossIncome, deductions);
    var vat = vatBase === undefined ? 0 : calculateVat(vatBase, vatRate);

    return {
      grossIncome: round2(grossIncome),
      taxableIncome: round2(Math.max(0, grossIncome - (deductions === undefined ? STANDARD_DEDUCTION : deductions))),
      incomeTax: incomeTax,
      effectiveRate: grossIncome === 0 ? 0 : round2((incomeTax / grossIncome) * 100),
      vat: vat,
      takeHome: round2(grossIncome - incomeTax - vat)
    };
  }

  function formatCurrency(n) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return {
    BRACKETS: BRACKETS,
    STANDARD_DEDUCTION: STANDARD_DEDUCTION,
    federalIncomeTax: federalIncomeTax,
    calculateVat: calculateVat,
    calculateTakeHome: calculateTakeHome,
    formatCurrency: formatCurrency,
    round2: round2
  };
}));