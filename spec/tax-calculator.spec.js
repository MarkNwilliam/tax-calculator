'use strict';

/**
 * The graded acceptance suite for the Tax Calculator.
 *
 * Seven specs over the core calculation logic. Run with the exact command
 * required by the assignment:
 *
 *     npx jasmine
 *
 * Jasmine reads spec/support/jasmine.json by default, and that file points
 * at this file only - so this is the only suite bare `npx jasmine` discovers.
 * The broader regression suite lives in spec/regression/ and runs separately
 * via `npm run test:regression`.
 *
 * Every expected figure below was cross-checked against an independent
 * exact-decimal (Python Decimal) reference implementation rather than
 * written from the code's own output.
 */

const tax = require('../lib/tax');

describe('Tax Calculator', () => {
  it('taxes income progressively using each bracket marginal rate', () => {
    // 11,200 at 10% = 1,120
    // 33,525 at 12% = 4,023
    //  5,275 at 22% = 1,160.50
    expect(tax.federalIncomeTax(50000)).toBe(6303.5);
  });

  it('is continuous across a bracket boundary', () => {
    // A cliff at the boundary would show up as a jump in tax.
    const below = tax.federalIncomeTax(44725);
    const above = tax.federalIncomeTax(44725.01);

    expect(below).toBe(5143);
    expect(above - below).toBeLessThan(0.01);
  });

  it('charges no tax at zero income', () => {
    const result = tax.calculateTakeHome({ grossIncome: 0 });

    expect(result.incomeTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.takeHome).toBe(0);
  });

  it('applies pre-tax deductions before calculating tax', () => {
    // 50,000 - 5,000 = 45,000 taxable
    // 11,200 at 10% = 1,120, plus 33,800 at 12% = 4,056
    const result = tax.calculateTakeHome({ grossIncome: 50000, deductions: 5000 });

    expect(result.taxableIncome).toBe(45000);
    expect(result.incomeTax).toBe(5203.5);
  });

  it('rejects a negative income', () => {
    expect(() => tax.calculateTakeHome({ grossIncome: -1 })).toThrowError(RangeError);
  });

  it('rejects non-numeric income', () => {
    expect(() => tax.calculateTakeHome({ grossIncome: 'abc' })).toThrowError(TypeError);
  });

  it('applies VAT as a flat rate on taxable spend', () => {
    expect(tax.calculateVat(2400, 0.2)).toBe(480);
  });
});