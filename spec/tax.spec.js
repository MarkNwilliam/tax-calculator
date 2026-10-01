'use strict';

const tax = require('../lib/tax');

describe('Tax calculator', () => {
  describe('round2', () => {
    it('rounds to cents without floating point dust', () => {
      expect(tax.round2(0.1 + 0.2)).toBe(0.3);
      expect(tax.round2(1.005)).toBe(1.01);
      expect(tax.round2(2.675)).toBe(2.68);
      expect(tax.round2(10 / 3)).toBe(3.33);
    });
  });

  describe('assertAmount', () => {
    it('accepts numbers and numeric strings', () => {
      expect(tax.assertAmount(100, 'x')).toBe(100);
      expect(tax.assertAmount('100.50', 'x')).toBe(100.5);
      expect(tax.assertAmount(0, 'x')).toBe(0);
    });

    it('rejects missing values', () => {
      expect(() => tax.assertAmount(undefined, 'income')).toThrowError('income is required');
      expect(() => tax.assertAmount(null, 'income')).toThrowError(TypeError);
      expect(() => tax.assertAmount('', 'income')).toThrowError('income is required');
    });

    it('rejects values that are not numbers', () => {
      expect(() => tax.assertAmount('abc', 'income')).toThrowError(TypeError);
      expect(() => tax.assertAmount(NaN, 'income')).toThrowError(TypeError);
      expect(() => tax.assertAmount({}, 'income')).toThrowError(TypeError);
    });

    it('rejects Infinity and negatives', () => {
      expect(() => tax.assertAmount(Infinity, 'income')).toThrowError(RangeError);
      expect(() => tax.assertAmount(-1, 'income')).toThrowError('income must not be negative');
    });
  });

  describe('federalIncomeTax', () => {
    it('taxes the lowest band at 10%, with no exempt slice', () => {
      expect(tax.federalIncomeTax(0)).toBe(0);
      expect(tax.federalIncomeTax(5000)).toBe(500);
      expect(tax.federalIncomeTax(11200)).toBe(1120);
    });

    it('applies only the marginal rate to the next slice', () => {
      // 11200 taxed at 10% = 1120
      expect(tax.federalIncomeTax(11201)).toBe(1120.12);
      expect(tax.federalIncomeTax(20000)).toBe(2176);
    });

    it('stacks each bracket as income climbs', () => {
      const tax50k = tax.federalIncomeTax(50000);
      // 11200@10 + 33525@12 + 5275@22 = 1120 + 4023 + 1160.5
      expect(tax50k).toBe(6303.5);
      expect(tax.federalIncomeTax(50001)).toBeGreaterThan(tax50k);
    });

    it('is continuous across bracket boundaries', () => {
      // A cliff at 44725 would show up as a jump larger than one cents step.
      const below = tax.federalIncomeTax(44725);
      const above = tax.federalIncomeTax(44725.01);
      expect(above - below).toBeLessThan(0.01);
      expect(below).toBe(5143);
    });

    it('applies the top rate above the final bracket', () => {
      expect(tax.federalIncomeTax(600000)).toBeGreaterThan(tax.federalIncomeTax(578125));
      expect(tax.federalIncomeTax(578125)).toBe(174234.25);
    });

    it('is monotonically non-decreasing', () => {
      let previous = -1;
      for (let income = 0; income <= 700000; income += 2500) {
        const current = tax.federalIncomeTax(income);
        expect(current).not.toBeLessThan(previous);
        previous = current;
      }
    });

    it('rejects invalid income', () => {
      expect(() => tax.federalIncomeTax(-5)).toThrowError(RangeError);
      expect(() => tax.federalIncomeTax('lots')).toThrowError(TypeError);
      expect(() => tax.federalIncomeTax()).toThrowError(TypeError);
    });
  });

  describe('bracketBreakdown', () => {
    it('lists one row per bracket the income reaches', () => {
      const rows = tax.bracketBreakdown(50000);
      expect(rows.length).toBe(3);
      expect(rows[0]).toEqual({ from: 0, to: 11200, rate: 0.1, taxable: 11200, tax: 1120 });
      expect(rows[2].to).toBe(50000);
    });

    it('returns no rows for zero income', () => {
      expect(tax.bracketBreakdown(0).length).toBe(0);
    });

    it('sums its rows to the headline tax', () => {
      const rows = tax.bracketBreakdown(82000);
      const summed = rows.reduce((s, r) => s + r.tax, 0);
      expect(tax.round2(summed)).toBe(tax.federalIncomeTax(82000));
    });
  });

  describe('calculateVat', () => {
    it('multiplies the amount by the rate', () => {
      expect(tax.calculateVat(100, 0.2)).toBe(20);
      expect(tax.calculateVat(99.99, 0.075)).toBe(7.5);
      expect(tax.calculateVat(0, 0.2)).toBe(0);
    });

    it('refuses a percentage instead of a fraction', () => {
      expect(() => tax.calculateVat(100, 20)).toThrowError(/rate must be a fraction/);
    });

    it('rejects a negative base', () => {
      expect(() => tax.calculateVat(-5, 0.2)).toThrowError(RangeError);
    });
  });

  describe('calculateTakeHome', () => {
    it('subtracts deductions before taxing', () => {
      const result = tax.calculateTakeHome({ grossIncome: 50000, deductions: 5000 });
      expect(result.taxableIncome).toBe(45000);
      expect(result.incomeTax).toBe(tax.federalIncomeTax(45000));
    });

    it('computes take-home as taxable minus tax', () => {
      const r = tax.calculateTakeHome({ grossIncome: 50000 });
      expect(r.takeHome).toBe(tax.round2(r.taxableIncome - r.incomeTax));
      expect(r.takeHome).toBe(43696.5);
    });

    it('reports the effective rate as a percentage', () => {
      const r = tax.calculateTakeHome({ grossIncome: 82000 });
      expect(r.effectiveRate).toBe(16.27);
      expect(r.effectiveRate).toBeLessThan(22);
    });

    it('is zero-safe for zero income', () => {
      const r = tax.calculateTakeHome({ grossIncome: 0 });
      expect(r.incomeTax).toBe(0);
      expect(r.effectiveRate).toBe(0);
      expect(r.takeHome).toBe(0);
      expect(r.brackets.length).toBe(0);
    });

    it('includes VAT only when spend is supplied', () => {
      const withVat = tax.calculateTakeHome({ grossIncome: 50000, vatAmount: 1000, vatRate: 0.2 });
      expect(withVat.vat.amount).toBe(200);
      const without = tax.calculateTakeHome({ grossIncome: 50000 });
      expect(without.vat).toBeNull();
    });

    it('defaults the VAT rate to 20%', () => {
      expect(tax.calculateTakeHome({ grossIncome: 100, vatAmount: 500 }).vat.amount).toBe(100);
    });

    it('rejects deductions larger than income', () => {
      expect(() => tax.calculateTakeHome({ grossIncome: 100, deductions: 500 }))
        .toThrowError('deductions cannot exceed grossIncome');
    });

    it('rejects a missing income', () => {
      expect(() => tax.calculateTakeHome({})).toThrowError('grossIncome is required');
      expect(() => tax.calculateTakeHome()).toThrowError(TypeError);
      expect(() => tax.calculateTakeHome(null)).toThrowError('input object is required');
    });

    it('rejects a VAT rate above 1', () => {
      expect(() => tax.calculateTakeHome({ grossIncome: 100, vatAmount: 10, vatRate: 20 }))
        .toThrowError(/vatRate must be a fraction/);
    });

    it('never returns negative take-home pay', () => {
      for (let income = 0; income < 300000; income += 7777) {
        expect(tax.calculateTakeHome({ grossIncome: income }).takeHome).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('formatCurrency', () => {
    it('renders a US dollar amount', () => {
      expect(tax.formatCurrency(1234.5)).toBe('$1,234.50');
    });

    it('handles zero and rejects junk', () => {
      expect(tax.formatCurrency(0)).toBe('$0.00');
      expect(() => tax.formatCurrency('x')).toThrowError(TypeError);
    });
  });
});