'use strict';
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0);
const $ = id => document.getElementById(id);

async function calculate(){
  const payload = {
    grossIncome: $('grossIncome').value,
    deductions: $('deductions').value === '' ? undefined : $('deductions').value,
    vatAmount: $('vatAmount').value === '' ? undefined : $('vatAmount').value,
    vatRate: $('vatAmount').value === '' ? undefined : $('vatRate').value
  };
  const err = $('error'); err.hidden = true;
  try{
    const res = await fetch('/api/calculate',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    const data = await res.json();
    if(!res.ok || data.ok === false) throw new Error(data.error || 'Calculation failed');

    $('takeHome').textContent      = money(data.takeHome);
    $('grossIncomeOut').textContent= money(data.grossIncome);
    $('deductionsOut').textContent= money(data.deductions);
    $('taxableIncomeOut').textContent = money(data.taxableIncome);
    $('incomeTaxOut').textContent  = money(data.incomeTax);
    $('effectiveRateOut').textContent = data.effectiveRate.toFixed(2) + '%';
    $('vatOut').textContent        = data.vat ? money(data.vat.amount) : '$0.00';

    const tbody = document.querySelector('#brackets tbody');
    tbody.innerHTML = data.brackets.map(b => `
      <tr>
        <td>${money(b.from)} &ndash; ${b.to === null ? 'above' : money(b.to)}</td>
        <td>${(b.rate*100).toFixed(0)}%</td>
        <td>${money(b.taxable)}</td>
        <td>${money(b.tax)}</td>
      </tr>`).join('') || '<tr><td colspan="4">No income - no tax.</td></tr>';
  }catch(e){
    err.textContent = e.message; err.hidden = false;
  }
}

$('taxForm').addEventListener('submit', e => { e.preventDefault(); calculate(); });

fetch('/api/health').then(r=>r.json())
  .then(d=>{ $('healthBadge').textContent = 'Service healthy - ' + d.service + ' v' + d.version;
             $('healthBadge').className='ok'; })
  .catch(()=>{ $('healthBadge').textContent='Service unreachable'; $('healthBadge').className='bad'; });

calculate();
