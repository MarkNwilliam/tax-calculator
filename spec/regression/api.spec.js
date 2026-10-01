const express = require('express');
const request = require('supertest');
const app = require('../../app');

describe('Tax Calculator HTTP API', () => {
  describe('GET /api/health', () => {
    it('reports ok, and is what the container HEALTHCHECK calls', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('tax-calculator');
    });
  });

  describe('GET /api/brackets', () => {
    it('publishes the bracket table', async () => {
      const res = await request(app).get('/api/brackets');
      expect(res.status).toBe(200);
      expect(res.body.brackets.length).toBeGreaterThan(0);
      expect(res.body.brackets[0].rate).toBe(0.1);
    });
  });

  describe('POST /api/calculate', () => {
    it('calculates a full payslip', async () => {
      const res = await request(app)
        .post('/api/calculate')
        .send({ grossIncome: 50000, deductions: 5000, vatAmount: 1000, vatRate: 0.2 });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.taxableIncome).toBe(45000);
      expect(res.body.incomeTax).toBe(5203.5);
      expect(res.body.vat.amount).toBe(200);
    });

    it('omits vat when no spend is given', async () => {
      const res = await request(app).post('/api/calculate').send({ grossIncome: 50000 });
      expect(res.status).toBe(200);
      expect(res.body.vat).toBeUndefined();
    });

    it('rejects a negative income with 400', async () => {
      const res = await request(app).post('/api/calculate').send({ grossIncome: -10 });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('negative');
    });

    it('rejects a missing income with 422', async () => {
      const res = await request(app).post('/api/calculate').send({});
      expect(res.status).toBe(422);
      expect(res.body.error).toContain('grossIncome is required');
    });

    it('rejects deductions above income with 400', async () => {
      const res = await request(app)
        .post('/api/calculate')
        .send({ grossIncome: 100, deductions: 9999 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('cannot exceed');
    });

    it('handles an empty body without crashing', async () => {
      const res = await request(app).post('/api/calculate');
      expect(res.status).toBe(422);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('GET /api/tax/:income', () => {
    it('returns the income tax for an income', async () => {
      const res = await request(app).get('/api/tax/50000');
      expect(res.status).toBe(200);
      expect(res.body.incomeTax).toBe(6303.5);
    });

    it('rejects a non-numeric income', async () => {
      const res = await request(app).get('/api/tax/abc');
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('static frontend', () => {
    it('serves the calculator page', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Tax Calculator');
    });
  });
});