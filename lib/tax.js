'use strict';

/**
 * Progressive tax calculation.
 *
 * Everything in this module is pure: no I/O, no globals, no clock. That is
 * what makes it cheap to cover exhaustively with Jasmine and safe to call
 * from the HTTP layer, a Tekton task, or the CLI.
 */

/** 2024 US federal income tax brackets: [upper bound, rate]. */
const TAX_BRACKETS = [
  { upTo: 11200, rate: 0.1 },
  { upTo: 44725, rate: 0.12 },
  { upTo: 95375, rate: 0.22 },
  { upTo: 182100, rate: 0.24 },
  { upTo: 231250, rate: 0.32 },
  { upTo: 578125, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 }
];

/** Round to cents without the float dust that `toFixed` leaves behind. */
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Reject anything that is not a usable non-negative amount.
 * Guards the API against null, strings, NaN, Infinity and negatives.
 */
function assertAmount(value, name) {
  if (value === undefined || value === null || value === '') {
    throw new TypeError(name + ' is required');
  }
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || Number.isNaN(n)) {
    throw new TypeError(name + ' must be a number, got: ' + JSON.stringify(value));
  }
  if (!Number.isFinite(n)) {
    throw new RangeError(name + ' must be finite');
  }
  if (n < 0) {
    throw new RangeError(name + ' must not be negative');
  }
  return n;
}

/** How much of each bracket the income actually reaches. */
function bracketBreakdown(taxableIncome, brackets) {
  const table = brackets || TAX_BRACKETS;
  const income = assertAmount(taxableIncome, 'taxableIncome');

  let floor = 0;
  return table.reduce((rows, bracket) => {
    const ceiling = Math.min(income, bracket.upTo);
    if (ceiling > floor) {
      rows.push({
        from: floor,
        to: ceiling,
        rate: bracket.rate,
        taxable: round2(ceiling - floor),
        tax: round2((ceiling - floor) * bracket.rate)
      });
      floor = ceiling;
    }
    return rows;
  }, []);
}

/** Progressive income tax: each slice of income is taxed at its own rate. */
function federalIncomeTax(taxableIncome, brackets) {
  return round2(
    bracketBreakdown(taxableIncome, brackets).reduce((sum, row) => sum + row.tax, 0)
  );
}

/** Simple single-rate tax, used for VAT / sales tax. */
function calculateVat(amount, rate) {
  const base = assertAmount(amount, 'amount');
  const r = assertAmount(rate, 'rate');
  if (r > 1) throw new RangeError('rate must be a fraction (0.2), not a percentage (20)');
  return round2(base * r);
}

/**
 * Full payslip-style breakdown.
 *
 * @param {object} input
 * @param {number} input.grossIncome    total income before deductions
 * @param {number} [input.deductions]  pre-tax deductions (pension, health, etc.)
 * @param {number} [input.vatAmount]   taxable spend, for the VAT line
 * @param {number} [input.vatRate]     VAT fraction, default 0.2
 */
function calculateTakeHome(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('input object is required');
  }

  const gross = assertAmount(input.grossIncome, 'grossIncome');
  const deductions = input.deductions === undefined ? 0 : assertAmount(input.deductions, 'deductions');
  const vatRate = input.vatRate === undefined ? 0.2 : assertAmount(input.vatRate, 'vatRate');

  if (deductions > gross) {
    throw new RangeError('deductions cannot exceed grossIncome');
  }
  if (vatRate > 1) throw new RangeError('vatRate must be a fraction (0.2), not a percentage (20)');

  const taxableIncome = round2(gross - deductions);
  const incomeTax = federalIncomeTax(taxableIncome);
  const vat = input.vatAmount === undefined
    ? null
    : calculateVat(input.vatAmount, vatRate);

  return {
    grossIncome: round2(gross),
    deductions: round2(deductions),
    taxableIncome,
    incomeTax,
    effectiveRate: taxableIncome === 0 ? 0 : round2((incomeTax / taxableIncome) * 100),
    takeHome: round2(taxableIncome - incomeTax),
    vat: vat === null ? null : { base: round2(assertAmount(input.vatAmount, 'vatAmount')), rate: vatRate, amount: vat },
    brackets: bracketBreakdown(taxableIncome)
  };
}

function formatCurrency(value, currency) {
  const code = currency || 'USD';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(
    assertAmount(value, 'value')
  );
}

module.exports = {
  TAX_BRACKETS,
  assertAmount,
  bracketBreakdown,
  federalIncomeTax,
  calculateVat,
  calculateTakeHome,
  formatCurrency,
  round2
};