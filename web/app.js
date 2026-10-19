/**
 * AIoT Multi-Dataset Interactive Machine Learning Dashboard
 * Supports: 50_Startups, Boston Housing, CarDekho
 * Powered by Vanilla JS & Chart.js
 */

let allData = null;
let currentKey = 'startups';
let currentDataset = null;

let chartRMSE = null;
let chartR2 = null;
let chartScatter = null;
let chartResiduals = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    allData = await response.json();
    
    initMultiDatasetDashboard();
  } catch (error) {
    console.error('Failed to load data.json:', error);
    document.querySelector('.container').insertAdjacentHTML('afterbegin', `
      <div style="background:#fee2e2;border:1px solid #ef4444;color:#b91c1c;padding:16px;border-radius:8px;margin-bottom:20px;">
        ⚠️ 無法讀取 data.json。請確認透過 Web 伺服器開啟本頁面（例如 GitHub Pages 或本地 http-server）。
      </div>
    `);
  }
});

function initMultiDatasetDashboard() {
  // Bind Tab Switching Events
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetDataset = btn.getAttribute('data-dataset');
      if (targetDataset !== currentKey) {
        switchDataset(targetDataset);
      }
    });
  });

  // Load Initial Dataset
  switchDataset('startups');
}

function switchDataset(key) {
  currentKey = key;
  currentDataset = allData.datasets[key];
  if (!currentDataset) return;

  // 1. Update Active Tab UI
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-dataset') === key);
  });

  // 2. Update Header Info & Colab Link
  document.getElementById('hero-dataset-desc').textContent = currentDataset.description;
  const colabLink = document.getElementById('link-colab');
  if (key === 'startups') {
    colabLink.href = 'https://colab.research.google.com/github/contemplator/nchu-startup-50/blob/main/Startup_50_MLR_CRISP_DM.ipynb';
  } else if (key === 'boston') {
    colabLink.href = 'https://colab.research.google.com/github/contemplator/nchu-startup-50/blob/main/Boston_Housing_MLR_CRISP_DM.ipynb';
  } else if (key === 'cardekho') {
    colabLink.href = 'https://colab.research.google.com/github/contemplator/nchu-startup-50/blob/main/CarDekho_Used_Car_Price_MLR_CRISP_DM.ipynb';
  }

  // 3. Update Labels
  document.getElementById('label-rmse').textContent = `測試集 RMSE (${currentDataset.unit_label})`;
  document.getElementById('total-feature-count').textContent = currentDataset.total_features;

  // 4. Rebuild Slider Controls
  buildSliderControls();

  // 5. Render Comparison Table
  renderTable();

  // 6. Update or Re-init Charts
  renderDualCharts();

  // 7. Setup What-If Simulator
  buildSimulator();

  // 8. Render Diagnostics
  renderDiagnostics();

  // 9. Set to Optimal Step
  setFeatureStep(currentDataset.optimal_k);
}

// ----------------------------------------------------
// 1. Dynamic Controls & Step Buttons
// ----------------------------------------------------
function buildSliderControls() {
  const slider = document.getElementById('feature-slider');
  const container = document.getElementById('step-buttons-container');
  
  slider.min = 1;
  slider.max = currentDataset.total_features;
  slider.value = currentDataset.optimal_k;

  container.innerHTML = '';
  for (let i = 1; i <= currentDataset.total_features; i++) {
    const btn = document.createElement('button');
    btn.className = 'btn-step';
    btn.setAttribute('data-step', i);
    btn.textContent = i === currentDataset.optimal_k ? `${i} (最佳)` : i;
    btn.addEventListener('click', () => setFeatureStep(i));
    container.appendChild(btn);
  }

  slider.oninput = (e) => setFeatureStep(parseInt(e.target.value));
}

function setFeatureStep(stepNumber) {
  const step = currentDataset.steps.find(s => s.step === stepNumber);
  if (!step) return;

  // Update Slider & Buttons
  document.getElementById('feature-slider').value = stepNumber;
  document.getElementById('current-feature-count').textContent = stepNumber;

  document.querySelectorAll('.btn-step').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-step')) === stepNumber);
  });

  // Update Dynamic Metrics
  document.getElementById('disp-selected-features').textContent = `[${step.selected_features.join(', ')}]`;
  document.getElementById('disp-rmse').textContent = `${currentDataset.value_prefix}${step.rmse.toLocaleString('en-US', {minimumFractionDigits: 2})}${currentDataset.value_suffix}`;
  document.getElementById('disp-r2').textContent = step.r2.toFixed(4);
  document.getElementById('disp-added-feature').textContent = step.added_feature;

  // Update Overfitting Alert Card
  updateAlertBox(stepNumber);

  // Update Active Table Row
  document.querySelectorAll('#table-body tr').forEach(tr => tr.classList.remove('active-row'));
  const activeTr = document.getElementById(`row-step-${stepNumber}`);
  if (activeTr) activeTr.classList.add('active-row');

  // Update Highlighted Point in Dual Charts
  if (chartRMSE && chartR2) {
    const pointRadii = currentDataset.steps.map(s => s.step === stepNumber ? 10 : 5);
    const pointColors = currentDataset.steps.map(s => s.step === stepNumber ? '#dc2626' : '#1e40af');

    chartRMSE.data.datasets[0].pointRadius = pointRadii;
    chartRMSE.data.datasets[0].pointBackgroundColor = pointColors;
    chartRMSE.update('none');

    chartR2.data.datasets[0].pointRadius = pointRadii;
    chartR2.data.datasets[0].pointBackgroundColor = pointColors;
    chartR2.update('none');
  }
}

function updateAlertBox(stepNumber) {
  const alertBox = document.getElementById('overfitting-alert');
  const alertTitle = document.getElementById('alert-title');
  const alertDesc = document.getElementById('alert-desc');
  const optK = currentDataset.optimal_k;

  if (stepNumber === optK) {
    alertBox.className = 'alert-box alert-optimal';
    alertTitle.textContent = `🎯 全域最佳泛化平衡點 (Global Sweet Spot: k=${optK})`;
    alertDesc.textContent = `當選取 ${optK} 個特徵時，測試集 RMSE 降至全域最低點，R² 達到最佳峰值。此模型在偏差與變異數之間取得最卓越的平衡！`;
  } else if (stepNumber < optK) {
    alertBox.className = 'alert-box alert-info';
    alertTitle.textContent = `ℹ️ 特徵精簡階段 (Underfitting / High Bias: k=${stepNumber})`;
    alertDesc.textContent = `當前特徵數量較少，模型結構精簡，但尚未充分吸收其他關鍵自變數的邊際解釋力。`;
  } else {
    alertBox.className = 'alert-box alert-warning';
    alertTitle.textContent = `⚠️ 進入過擬合警戒區 (Overfitting / Noise: k=${stepNumber})`;
    alertDesc.textContent = `特徵數超越最佳點 ${optK} 後，測試集 RMSE 出現逆勢回升或 R² 停滯下降。新增之變數對預測無實質幫助，反而引入隨機雜訊與多重共線性！`;
  }
}

// ----------------------------------------------------
// 2. Comparison Table
// ----------------------------------------------------
function renderTable() {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  currentDataset.steps.forEach(step => {
    const tr = document.createElement('tr');
    tr.id = `row-step-${step.step}`;

    let statusBadge = '<span style="color:#64748b;">次佳模型</span>';
    if (step.step === currentDataset.optimal_k) {
      statusBadge = '<span style="color:#059669;font-weight:700;">⭐ 全域最優 (Sweet Spot)</span>';
      tr.classList.add('optimal-row');
    } else if (step.step > currentDataset.optimal_k) {
      statusBadge = '<span style="color:#d97706;font-weight:600;">⚠️ 輕度/重度過擬合</span>';
    }

    tr.innerHTML = `
      <td><strong>${step.step}</strong></td>
      <td><code>[${step.selected_features.join(', ')}]</code></td>
      <td style="font-family:var(--font-mono);">${currentDataset.value_prefix}${step.rmse.toLocaleString('en-US', {minimumFractionDigits: 4})}${currentDataset.value_suffix}</td>
      <td style="font-family:var(--font-mono);">${step.r2.toFixed(4)}</td>
      <td>${statusBadge}</td>
    `;

    tr.addEventListener('click', () => setFeatureStep(step.step));
    tbody.appendChild(tr);
  });
}

// ----------------------------------------------------
// 3. Dual Line Charts (Chart.js)
// ----------------------------------------------------
function renderDualCharts() {
  const steps = currentDataset.steps;
  const labels = steps.map(s => s.step);
  const rmseData = steps.map(s => s.rmse);
  const r2Data = steps.map(s => s.r2);

  if (chartRMSE) chartRMSE.destroy();
  if (chartR2) chartR2.destroy();

  // RMSE Chart
  const ctxRMSE = document.getElementById('chart-rmse').getContext('2d');
  chartRMSE = new Chart(ctxRMSE, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `RMSE (${currentDataset.unit_label})`,
        data: rmseData,
        borderColor: '#1e40af',
        backgroundColor: '#1e40af',
        borderWidth: 2.5,
        tension: 0,
        pointRadius: 5,
        pointHoverRadius: 9
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `RMSE by Number of Features (${currentDataset.title})`,
          font: { size: 14, weight: 'bold' },
          color: '#0f172a'
        },
        legend: { display: false }
      },
      scales: {
        x: {
          title: { display: true, text: 'Number of Features (k)', font: { weight: 600 } },
          grid: { color: '#f1f5f9' }
        },
        y: {
          title: { display: true, text: 'RMSE', font: { weight: 600 } },
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
        label: 'R-squared (R²)',
        data: r2Data,
        borderColor: '#059669',
        backgroundColor: '#059669',
        borderWidth: 2.5,
        tension: 0,
        pointRadius: 5,
        pointHoverRadius: 9
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `R-squared by Number of Features (${currentDataset.title})`,
          font: { size: 14, weight: 'bold' },
          color: '#0f172a'
        },
        legend: { display: false }
      },
      scales: {
        x: {
          title: { display: true, text: 'Number of Features (k)', font: { weight: 600 } },
          grid: { color: '#f1f5f9' }
        },
        y: {
          title: { display: true, text: 'R-squared', font: { weight: 600 } },
          grid: { color: '#e2e8f0' }
        }
      }
    }
  });
}

// ----------------------------------------------------
// 4. Dynamic What-If Simulator
// ----------------------------------------------------
function buildSimulator() {
  const container = document.getElementById('calc-inputs-container');
  const sim = currentDataset.simulator;
  const title = document.getElementById('calc-result-title');
  const formulaDisp = document.getElementById('calc-formula-display');
  
  title.textContent = `預估 ${currentDataset.unit_label}`;

  container.innerHTML = `
    <div class="input-group">
      <div class="input-header">
        <span>${sim.input1.label}</span>
        <span class="input-val-badge" id="badge-in1">${sim.input1.prefix}${sim.input1.default}${sim.input1.suffix}</span>
      </div>
      <input type="range" id="sim-input-1" class="range-slider" 
             min="${sim.input1.min}" max="${sim.input1.max}" step="${sim.input1.step}" value="${sim.input1.default}">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-top:4px;">
        <span>${sim.input1.prefix}${sim.input1.min}${sim.input1.suffix}</span>
        <span>${sim.input1.prefix}${sim.input1.max}${sim.input1.suffix}</span>
      </div>
    </div>

    <div class="input-group">
      <div class="input-header">
        <span>${sim.input2.label}</span>
        <span class="input-val-badge" id="badge-in2">${sim.input2.prefix}${sim.input2.default}${sim.input2.suffix}</span>
      </div>
      <input type="range" id="sim-input-2" class="range-slider" 
             min="${sim.input2.min}" max="${sim.input2.max}" step="${sim.input2.step}" value="${sim.input2.default}">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-top:4px;">
        <span>${sim.input2.prefix}${sim.input2.min}${sim.input2.suffix}</span>
        <span>${sim.input2.prefix}${sim.input2.max}${sim.input2.suffix}</span>
      </div>
    </div>
  `;

  const in1 = document.getElementById('sim-input-1');
  const in2 = document.getElementById('sim-input-2');
  const badge1 = document.getElementById('badge-in1');
  const badge2 = document.getElementById('badge-in2');
  const resultDisp = document.getElementById('calc-profit-result');

  function calculate() {
    const v1 = parseFloat(in1.value);
    const v2 = parseFloat(in2.value);

    badge1.textContent = `${sim.input1.prefix}${v1.toLocaleString()}${sim.input1.suffix}`;
    badge2.textContent = `${sim.input2.prefix}${v2.toLocaleString()}${sim.input2.suffix}`;

    let predicted = 0;
    const opt = currentDataset.optimal_model;

    if (currentKey === 'startups') {
      const b0 = opt.intercept;
      const b_rd = opt.coefficients['R&D Spend'] || 0.7966;
      const b_mkt = opt.coefficients['Marketing Spend'] || 0.0299;
      predicted = b0 + (b_rd * v1) + (b_mkt * v2);
      formulaDisp.textContent = `Profit = ${b0.toFixed(2)} + (${b_rd} × RD) + (${b_mkt} × Mkt)`;
      resultDisp.textContent = `$${predicted.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    } else if (currentKey === 'boston') {
      const b0 = opt.intercept;
      const b_rm = opt.coefficients['rm'] || 4.2;
      const b_lstat = opt.coefficients['lstat'] || -0.55;
      predicted = b0 + (b_rm * v1) + (b_lstat * v2);
      formulaDisp.textContent = `medv = ${b0.toFixed(2)} + (${b_rm} × rm) + (${b_lstat} × lstat)`;
      resultDisp.textContent = `$${(predicted * 1000).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})} (medv: ${predicted.toFixed(2)}k)`;
    } else if (currentKey === 'cardekho') {
      const b0 = opt.intercept;
      const b_p = opt.coefficients['Present_Price'] || 0.45;
      const b_age = opt.coefficients['Car_Age'] || -0.32;
      predicted = Math.max(0.2, b0 + (b_p * v1) + (b_age * v2));
      formulaDisp.textContent = `Selling_Price = ${b0.toFixed(2)} + (${b_p} × Present_Price) + (${b_age} × Age)`;
      resultDisp.textContent = `${predicted.toFixed(2)} 萬盧比`;
    }
  }

  in1.addEventListener('input', calculate);
  in2.addEventListener('input', calculate);

  calculate();
}

// ----------------------------------------------------
// 5. Diagnostics Charts
// ----------------------------------------------------
function renderDiagnostics() {
  const samples = currentDataset.test_samples;
  const actuals = samples.map(s => s.actual);
  const preds = samples.map(s => s.predicted);
  const residuals = samples.map(s => s.residual);

  if (chartScatter) chartScatter.destroy();
  if (chartResiduals) chartResiduals.destroy();

  const minVal = Math.min(...actuals, ...preds) * 0.9;
  const maxVal = Math.max(...actuals, ...preds) * 1.05;

  // Scatter Actual vs Predicted
  const ctxScatter = document.getElementById('chart-actual-vs-pred').getContext('2d');
  chartScatter = new Chart(ctxScatter, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: '測試集樣本',
          data: samples.map(s => ({ x: s.actual, y: s.predicted })),
          backgroundColor: '#059669',
          borderColor: '#065f46',
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: '理想對角線 (y = x)',
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
          text: `實際值 vs 預測值 (${currentDataset.title})`,
          font: { size: 14, weight: 'bold' },
          color: '#0f172a'
        }
      },
      scales: {
        x: {
          title: { display: true, text: `實際值 (${currentDataset.unit_label})`, font: { weight: 600 } },
          grid: { color: '#f1f5f9' }
        },
        y: {
          title: { display: true, text: `預測值 (${currentDataset.unit_label})`, font: { weight: 600 } },
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
          label: '殘差',
          data: samples.map(s => ({ x: s.predicted, y: s.residual })),
          backgroundColor: '#2563eb',
          borderColor: '#1e40af',
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: '基準線 (Residual = 0)',
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
        }
      },
      scales: {
        x: {
          title: { display: true, text: `預測值 (${currentDataset.unit_label})`, font: { weight: 600 } },
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
