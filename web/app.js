/**
 * 50_Startups Interactive Dashboard Logic
 * Powered by Vanilla JS & Chart.js
 */

let appData = null;
let chartRMSE = null;
let chartR2 = null;
let chartScatter = null;
let chartResiduals = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    appData = await response.json();
    
    initDashboard();
  } catch (error) {
    console.error('Failed to load data.json:', error);
    document.querySelector('.container').insertAdjacentHTML('afterbegin', `
      <div style="background:#fee2e2;border:1px solid #ef4444;color:#b91c1c;padding:16px;border-radius:8px;margin-bottom:20px;">
        ⚠️ 無法讀取 data.json。請確認透過 Web 伺服器開啟本頁面（例如 GitHub Pages 或本地 http-server）。
      </div>
    `);
  }
});

function initDashboard() {
  renderTable();
  initCharts();
  initSliderControls();
  initProfitSimulator();
  initDiagnosticCharts();

  // Set initial state to Step 2 (Optimal)
  setFeatureStep(2);
}

// 1. Populate Comparison Table
function renderTable() {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  appData.forward_selection_steps.forEach(step => {
    const tr = document.createElement('tr');
    tr.id = `row-step-${step.step}`;

    let statusBadge = '<span style="color:#64748b;">次佳模型</span>';
    if (step.step === 2) {
      statusBadge = '<span style="color:#059669;font-weight:700;">⭐ 全域最優 (Sweet Spot)</span>';
      tr.classList.add('optimal-row');
    } else if (step.step >= 3) {
      statusBadge = '<span style="color:#d97706;font-weight:600;">⚠️ 輕度/重度過擬合</span>';
    }

    tr.innerHTML = `
      <td><strong>${step.step}</strong></td>
      <td><code>[${step.selected_features.join(', ')}]</code></td>
      <td style="font-family:var(--font-mono);">${step.rmse.toLocaleString('en-US', {minimumFractionDigits: 6})}</td>
      <td style="font-family:var(--font-mono);">${step.r2.toFixed(6)}</td>
      <td>${statusBadge}</td>
    `;

    tr.addEventListener('click', () => setFeatureStep(step.step));
    tbody.appendChild(tr);
  });
}

// 2. Initialize Dual Charts (RMSE & R-squared)
function initCharts() {
  const steps = appData.forward_selection_steps;
  const labels = steps.map(s => s.step);
  const rmseData = steps.map(s => s.rmse);
  const r2Data = steps.map(s => s.r2);

  // Default Chart.js Config
  Chart.defaults.font.family = 'Inter, -apple-system, sans-serif';
  Chart.defaults.color = '#475569';

  // RMSE Chart
  const ctxRMSE = document.getElementById('chart-rmse').getContext('2d');
  chartRMSE = new Chart(ctxRMSE, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'RMSE (均方根誤差)',
        data: rmseData,
        borderColor: '#1f77b4',
        backgroundColor: '#1f77b4',
        borderWidth: 2.5,
        tension: 0,
        pointRadius: [5, 9, 5, 5, 5],
        pointHoverRadius: 9,
        pointBackgroundColor: labels.map(l => l === 2 ? '#dc2626' : '#1f77b4'),
        pointBorderColor: labels.map(l => l === 2 ? '#ffffff' : '#1f77b4'),
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'RMSE by Number of Features',
          font: { size: 14, weight: 'bold' },
          color: '#0f172a'
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `RMSE: ${ctx.parsed.y.toLocaleString('en-US', {minimumFractionDigits: 2})}`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Number of Features', font: { weight: 600 } },
          grid: { color: '#f1f5f9' }
        },
        y: {
          title: { display: true, text: 'RMSE', font: { weight: 600 } },
          min: 8100,
          max: 9200,
          grid: { color: '#e2e8f0' }
        }
      }
    }
  });

  // R-squared Chart
  const ctxR2 = document.getElementById('chart-r2').getContext('2d');
  chartR2 = new Chart(ctxR2, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'R-squared (判定係數)',
        data: r2Data,
        borderColor: '#1f77b4',
        backgroundColor: '#1f77b4',
        borderWidth: 2.5,
        tension: 0,
        pointRadius: [5, 9, 5, 5, 5],
        pointHoverRadius: 9,
        pointBackgroundColor: labels.map(l => l === 2 ? '#dc2626' : '#1f77b4'),
        pointBorderColor: labels.map(l => l === 2 ? '#ffffff' : '#1f77b4'),
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'R-squared by Number of Features',
          font: { size: 14, weight: 'bold' },
          color: '#0f172a'
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `R-squared: ${ctx.parsed.y.toFixed(6)}`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Number of Features', font: { weight: 600 } },
          grid: { color: '#f1f5f9' }
        },
        y: {
          title: { display: true, text: 'R-squared', font: { weight: 600 } },
          min: 0.934,
          max: 0.949,
          grid: { color: '#e2e8f0' }
        }
      }
    }
  });
}

// 3. Slider & Step Controls
function initSliderControls() {
  const slider = document.getElementById('feature-slider');
  slider.addEventListener('input', (e) => {
    setFeatureStep(parseInt(e.target.value));
  });

  const buttons = document.querySelectorAll('.btn-step');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      setFeatureStep(parseInt(btn.getAttribute('data-step')));
    });
  });
}

function setFeatureStep(stepNumber) {
  const step = appData.forward_selection_steps.find(s => s.step === stepNumber);
  if (!step) return;

  // Update UI Inputs
  document.getElementById('feature-slider').value = stepNumber;
  document.getElementById('current-feature-count').textContent = stepNumber;

  document.querySelectorAll('.btn-step').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-step')) === stepNumber);
  });

  // Update Metrics
  document.getElementById('disp-selected-features').textContent = `[${step.selected_features.join(', ')}]`;
  document.getElementById('disp-rmse').textContent = step.rmse.toLocaleString('en-US', {minimumFractionDigits: 2});
  document.getElementById('disp-r2').textContent = step.r2.toFixed(6);
  document.getElementById('disp-added-feature').textContent = step.added_feature;

  // Update Overfitting Alert Box
  const alertBox = document.getElementById('overfitting-alert');
  const alertTitle = document.getElementById('alert-title');
  const alertDesc = document.getElementById('alert-desc');

  if (stepNumber === 1) {
    alertBox.className = 'alert-box alert-info';
    alertTitle.textContent = 'ℹ️ 單特徵模型 (Baseline)';
    alertDesc.textContent = '單靠【R&D Spend】即能解釋 94.65% 的利潤變異（RMSE: 8274.87 美元），但尚未納入行銷支出的邊際增益。';
  } else if (stepNumber === 2) {
    alertBox.className = 'alert-box alert-optimal';
    alertTitle.textContent = '🎯 最佳泛化平衡點 (Global Sweet Spot)';
    alertDesc.textContent = '當特徵數為 2（R&D Spend + Marketing Spend）時，測試集 RMSE 降至全域最低（8,198.80 美元），R² 達到最高（0.947439），泛化能力最卓越！';
  } else if (stepNumber === 3) {
    alertBox.className = 'alert-box alert-warning';
    alertTitle.textContent = '⚠️ 開始出現輕微過擬合 (加入 State_New York)';
    alertDesc.textContent = '納入【State_New York】後，測試集 RMSE 逆勢上升至 8,309.06 美元（R² 下降），顯示州別資訊並未帶來有效預測力，反而消耗模型自由度。';
  } else if (stepNumber === 4) {
    alertBox.className = 'alert-box alert-warning';
    alertTitle.textContent = '⚠️ 過擬合擴大 (加入 State_Florida)';
    alertDesc.textContent = '連續納入兩項州別虛擬變數後，RMSE 進一步升至 8,409.92 美元，模型開始學習測試集不存在的雜訊。';
  } else if (stepNumber === 5) {
    alertBox.className = 'alert-box alert-warning';
    alertBox.style.background = '#fef2f2';
    alertBox.style.borderColor = '#fecaca';
    alertBox.style.color = '#991b1b';
    alertTitle.textContent = '🚨 顯著過擬合與多重共線性 (加入 Administration)';
    alertDesc.textContent = '加入【Administration 行政支出】後，測試集 RMSE 暴增至 9,137.99 美元（暴增近 939 美元！）。小樣本塞入 5 個特徵造成嚴重過擬合。';
  }

  // Update Table Row Highlight
  document.querySelectorAll('#table-body tr').forEach(tr => tr.classList.remove('active-row'));
  const activeTr = document.getElementById(`row-step-${stepNumber}`);
  if (activeTr) activeTr.classList.add('active-row');

  // Update Point Highlights on Charts
  if (chartRMSE && chartR2) {
    const pointRadii = [1, 2, 3, 4, 5].map(i => i === stepNumber ? 9 : 5);
    const pointColors = [1, 2, 3, 4, 5].map(i => i === stepNumber ? '#dc2626' : '#1f77b4');

    chartRMSE.data.datasets[0].pointRadius = pointRadii;
    chartRMSE.data.datasets[0].pointBackgroundColor = pointColors;
    chartRMSE.update('none');

    chartR2.data.datasets[0].pointRadius = pointRadii;
    chartR2.data.datasets[0].pointBackgroundColor = pointColors;
    chartR2.update('none');
  }
}

// 4. What-If Profit Simulator Logic
function initProfitSimulator() {
  const rdInput = document.getElementById('input-rd');
  const mktInput = document.getElementById('input-mkt');
  const badgeRD = document.getElementById('badge-rd');
  const badgeMkt = document.getElementById('badge-mkt');
  const profitResult = document.getElementById('calc-profit-result');

  const opt = appData.optimal_model;
  const intercept = opt.intercept;
  const coefRD = opt.coefficients['R&D Spend'];
  const coefMkt = opt.coefficients['Marketing Spend'];

  function updateProfit() {
    const rd = parseFloat(rdInput.value);
    const mkt = parseFloat(mktInput.value);

    badgeRD.textContent = `$${rd.toLocaleString()}`;
    badgeMkt.textContent = `$${mkt.toLocaleString()}`;

    const profit = intercept + (coefRD * rd) + (coefMkt * mkt);
    profitResult.textContent = `$${profit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }

  rdInput.addEventListener('input', updateProfit);
  mktInput.addEventListener('input', updateProfit);

  updateProfit();
}

// 5. Diagnostics Charts
function initDiagnosticCharts() {
  const samples = appData.test_samples;
  const actuals = samples.map(s => s.actual);
  const preds = samples.map(s => s.predicted);
  const residuals = samples.map(s => s.residual);

  // Scatter Actual vs Predicted
  const ctxScatter = document.getElementById('chart-actual-vs-pred').getContext('2d');
  const minVal = Math.min(...actuals, ...preds) * 0.9;
  const maxVal = Math.max(...actuals, ...preds) * 1.05;

  chartScatter = new Chart(ctxScatter, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: '測試集樣本 (10 startups)',
          data: samples.map(s => ({ x: s.actual, y: s.predicted })),
          backgroundColor: '#059669',
          borderColor: '#065f46',
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: '完美對角線 (y = x)',
          type: 'line',
          data: [{ x: minVal, y: minVal }, { x: maxVal, y: maxVal }],
          borderColor: '#dc2626',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '實際利潤 vs 預測利潤 (Actual vs Predicted)',
          font: { size: 14, weight: 'bold' },
          color: '#0f172a'
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `實際: $${ctx.parsed.x.toLocaleString()} | 預測: $${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: '實際利潤 (Actual Profit)', font: { weight: 600 } },
          grid: { color: '#f1f5f9' }
        },
        y: {
          title: { display: true, text: '預測利潤 (Predicted Profit)', font: { weight: 600 } },
          grid: { color: '#e2e8f0' }
        }
      }
    }
  });

  // Residuals Chart
  const ctxRes = document.getElementById('chart-residuals').getContext('2d');
  chartResiduals = new Chart(ctxRes, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: '殘差分佈 (Residuals)',
          data: samples.map(s => ({ x: s.predicted, y: s.residual })),
          backgroundColor: '#2563eb',
          borderColor: '#1e40af',
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: '零誤差基準線 (Residual = 0)',
          type: 'line',
          data: [{ x: minVal, y: 0 }, { x: maxVal, y: 0 }],
          borderColor: '#64748b',
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '殘差分佈圖 (Residuals vs Predicted)',
          font: { size: 14, weight: 'bold' },
          color: '#0f172a'
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `預測: $${ctx.parsed.x.toLocaleString()} | 殘差: $${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: '預測利潤 (Predicted Profit)', font: { weight: 600 } },
          grid: { color: '#f1f5f9' }
        },
        y: {
          title: { display: true, text: '殘差誤差 (Residual)', font: { weight: 600 } },
          grid: { color: '#e2e8f0' }
        }
      }
    }
  });
}
