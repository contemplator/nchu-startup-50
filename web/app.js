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

  // Initialize Custom Dataset Uploader Module
  initCustomDatasetUploader();

  // Load Initial Dataset
  switchDataset('startups');
}

function switchDataset(key) {
  currentKey = key;
  const customSection = document.getElementById('section-custom-dataset-input');

  // 1. Update Active Tab UI
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-dataset') === key);
  });

  // 2. Handle Custom Dataset Visibility
  if (key === 'custom') {
    if (customSection) customSection.style.display = 'block';
    const colabLink = document.getElementById('link-colab');
    if (colabLink) {
      colabLink.href = 'https://colab.research.google.com/';
      colabLink.textContent = '⚡ Colab Scratchpad';
    }

    if (!allData.datasets.custom) {
      document.getElementById('hero-dataset-desc').textContent = 
        '請於下方匯入自訂 CSV 資料集（可拖曳檔案或直接貼上）。系統將透過瀏覽器端 WebAssembly (Pyodide & scikit-learn) 當場執行 CRISP-DM 多元回歸與前向特徵選取！';
      document.getElementById('section-feature-selection').style.display = 'none';
      document.getElementById('section-profit-simulator').style.display = 'none';
      document.getElementById('section-diagnostics').style.display = 'none';
      return;
    }
  } else {
    if (customSection) customSection.style.display = 'none';
  }

  // Ensure analysis sections are visible when dataset is ready
  document.getElementById('section-feature-selection').style.display = 'block';
  document.getElementById('section-profit-simulator').style.display = 'block';
  document.getElementById('section-diagnostics').style.display = 'block';

  currentDataset = allData.datasets[key];
  if (!currentDataset) return;

  // 3. Update Header Info & Colab Link
  document.getElementById('hero-dataset-desc').textContent = currentDataset.description;
  const colabLink = document.getElementById('link-colab');
  if (colabLink) {
    colabLink.textContent = '⚡ Open in Colab';
    if (key === 'startups') {
      colabLink.href = 'https://colab.research.google.com/github/contemplator/nchu-startup-50/blob/main/Startup_50_MLR_CRISP_DM.ipynb';
    } else if (key === 'boston') {
      colabLink.href = 'https://colab.research.google.com/github/contemplator/nchu-startup-50/blob/main/Boston_Housing_MLR_CRISP_DM.ipynb';
    } else if (key === 'cardekho') {
      colabLink.href = 'https://colab.research.google.com/github/contemplator/nchu-startup-50/blob/main/CarDekho_Used_Car_Price_MLR_CRISP_DM.ipynb';
    }
  }

  // 4. Update Labels
  document.getElementById('label-rmse').textContent = `測試集 RMSE (${currentDataset.unit_label})`;
  document.getElementById('total-feature-count').textContent = currentDataset.total_features;

  // 5. Rebuild Slider Controls
  buildSliderControls();

  // 6. Render Comparison Table
  renderTable();

  // 7. Update or Re-init Charts
  renderDualCharts();

  // 8. Setup What-If Simulator
  buildSimulator();

  // 9. Render Diagnostics
  renderDiagnostics();

  // 10. Set to Optimal Step
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
    } else if (sim && sim.is_generic) {
      const b0 = opt.intercept;
      const f1 = sim.input1.name;
      const f2 = sim.input2 ? sim.input2.name : f1;
      const c1 = opt.coefficients[f1] || 0;
      const c2 = (sim.input2 && f2 !== f1) ? (opt.coefficients[f2] || 0) : 0;
      predicted = b0 + (c1 * v1) + (c2 * v2);
      const sign2 = c2 >= 0 ? '+' : '-';
      formulaDisp.textContent = `${currentDataset.unit_label} = ${b0.toFixed(2)} + (${c1} × ${f1}) ${sign2} (${Math.abs(c2)} × ${f2})`;
      resultDisp.textContent = `${currentDataset.value_prefix || ''}${predicted.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}${currentDataset.value_suffix || ''}`;
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

// ==========================================================================
// 6. Custom Dataset Import & Pyodide WebAssembly Execution Module
// ==========================================================================

const SAMPLE_CSV = `TV,Radio,Newspaper,Sales
230.1,37.8,69.2,22.1
44.5,39.3,45.1,10.4
17.2,45.9,69.3,9.3
151.5,41.3,58.5,18.5
180.8,10.8,58.4,12.9
8.7,48.9,75.0,7.2
57.5,32.8,23.5,11.8
120.2,19.6,11.6,13.2
8.6,2.1,1.0,4.8
199.8,2.6,21.2,10.6
66.1,5.8,24.2,8.6
214.7,24.0,4.0,17.4
23.8,35.1,65.9,9.2
97.5,7.6,7.2,9.7
204.1,32.9,46.0,19.0
195.4,47.7,52.9,22.4
67.9,36.6,114.0,12.5
281.4,39.6,55.8,24.4
69.2,20.5,18.3,11.3
147.3,23.9,19.1,14.6
218.4,27.7,53.4,18.0`;

let pyodideInstance = null;
let isPyodideLoading = false;

async function getPyodideInstance(statusCallback) {
  if (pyodideInstance) return pyodideInstance;
  if (isPyodideLoading) {
    while (isPyodideLoading) {
      await new Promise(r => setTimeout(r, 200));
    }
    return pyodideInstance;
  }

  isPyodideLoading = true;
  try {
    if (statusCallback) statusCallback('正在啟動 WebAssembly Python 執行環境...');
    if (typeof loadPyodide === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const py = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'
    });

    if (statusCallback) statusCallback('正在載入 pandas, scikit-learn 與 numpy (約需 5~10 秒)...');
    await py.loadPackage(['pandas', 'numpy', 'scikit-learn']);
    if (statusCallback) statusCallback('Python 運算引擎已就緒！');
    pyodideInstance = py;
    return pyodideInstance;
  } catch (err) {
    pyodideInstance = null;
    throw err;
  } finally {
    isPyodideLoading = false;
  }
}

const PYTHON_ANALYSIS_SCRIPT = `
import json
import io
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

def execute_regression(csv_content, target_col):
    try:
        df = pd.read_csv(io.StringIO(csv_content))
    except Exception as e:
        return json.dumps({"error": f"CSV 檔案解析失敗：{str(e)}"}, ensure_ascii=False)
    
    # 1. 樣本數檢核
    if len(df) < 10:
        return json.dumps({
            "error": f"資料樣本數過少（僅 {len(df)} 筆）。回歸分析與 80/20 訓練/測試集切分至少需要 10 筆以上資料。"
        }, ensure_ascii=False)
    
    # 2. 目標欄位檢核
    if target_col not in df.columns:
        return json.dumps({
            "error": f"在資料集表頭中找不到選定的目標預測變數：'{target_col}'。"
        }, ensure_ascii=False)
    
    # 3. 目標變數型別檢核與無變異防呆
    if not np.issubdtype(df[target_col].dtype, np.number):
        return json.dumps({
            "error": f"目標欄位「{target_col}」不是數值型別（目前型別為 {df[target_col].dtype}）。多元線性回歸的預測目標必須為連續數值！"
        }, ensure_ascii=False)
    if df[target_col].nunique() <= 1:
        return json.dumps({
            "error": f"目標欄位「{target_col}」所有樣本數值皆完全相同（變異數為 0），無法進行線性回歸預測。"
        }, ensure_ascii=False)
    
    # 4. 特徵初篩：排除 Unnamed 與高基數純文字識別標題欄位
    clean_notes = []
    y = df[target_col]
    X_raw = df.drop(columns=[target_col])
    
    unnamed_cols = [c for c in X_raw.columns if c.startswith('Unnamed:') or c == '']
    if unnamed_cols:
        X_raw = X_raw.drop(columns=unnamed_cols)
        
    high_card_text = [c for c in X_raw.select_dtypes(include=['object', 'category']).columns if X_raw[c].nunique() > 30]
    if high_card_text:
        X_raw = X_raw.drop(columns=high_card_text)
        clean_notes.append(f"已依 CRISP-DM 規範自動排除 {len(high_card_text)} 個非數值文字標題欄位（{', '.join(high_card_text[:3])}{'...' if len(high_card_text)>3 else ''}），專注於核心特徵分析。")
        
    if X_raw.shape[1] == 0:
        return json.dumps({
            "error": "除目標欄位外，未檢測到任何可用特徵自變數 (X)。"
        }, ensure_ascii=False)
    
    # 5. CRISP-DM 智慧容錯清理：只針對「實際參與建模的特徵與目標」進行缺失值檢驗
    model_df = pd.concat([X_raw, y], axis=1)
    total_null_rows = int(model_df.isnull().any(axis=1).sum())
    if total_null_rows > 0:
        null_ratio = total_null_rows / len(model_df)
        if null_ratio <= 0.10: # 核心特徵缺失佔比 <= 10%，自動執行合理清理
            clean_model_df = model_df.dropna()
            X_raw = clean_model_df.drop(columns=[target_col])
            y = clean_model_df[target_col]
            clean_notes.append(f"偵測到 {total_null_rows} 筆核心特徵包含空值 (NaN) 之樣本（佔比 {null_ratio:.2%}），已依 CRISP-DM 資料準備規範自動清理剔除。")
        else: # 核心特徵缺失過多才中斷提示
            null_counts = model_df.isnull().sum()
            cols_with_null = null_counts[null_counts > 0]
            details = "、".join([f"「{col}」包含 {cnt} 筆空值" for col, cnt in cols_with_null.items()])
            return json.dumps({
                "error": f"核心特徵缺失值比例過高（共 {total_null_rows} 筆，佔比 {null_ratio:.1%}）：{details}。為避免模型失真，請先進行特徵清理或補值！"
            }, ensure_ascii=False)
    
    # 6. One-Hot Encoding (drop_first=True)
    X = pd.get_dummies(X_raw, drop_first=True)
    
    # 移除零變異數欄位
    zero_var = [c for c in X.columns if X[c].nunique() <= 1]
    if zero_var:
        X = X.drop(columns=zero_var)
    if X.shape[1] == 0:
        return json.dumps({
            "error": "所有候選特徵之數值皆完全相同（變異數為 0），無法進行線性回歸。"
        }, ensure_ascii=False)
    
    # 限制最大特徵數為 12，防止前端運算過久卡死
    max_k = min(len(X.columns), 12)
    
    # 80/20 train/test split (固定隨機種子以確保重現性)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    selected = []
    steps = []
    
    for k in range(1, max_k + 1):
        candidates = [col for col in X.columns if col not in selected]
        best_rmse = np.inf
        best_r2 = -np.inf
        best_mae = np.inf
        best_feat = None
        best_model = None
        
        for feat in candidates:
            feats = selected + [feat]
            m = LinearRegression().fit(X_train[feats], y_train)
            yp = m.predict(X_test[feats])
            rmse = float(np.sqrt(mean_squared_error(y_test, yp)))
            r2 = float(r2_score(y_test, yp))
            mae = float(mean_absolute_error(y_test, yp))
            
            if rmse < best_rmse:
                best_rmse = rmse
                best_r2 = r2
                best_mae = mae
                best_feat = feat
                best_model = m
                
        selected.append(best_feat)
        coef_dict = {f: round(float(c), 4) for f, c in zip(selected, best_model.coef_)}
        
        steps.append({
            'step': k,
            'selected_features': list(selected),
            'added_feature': best_feat,
            'raw_rmse': best_rmse,
            'rmse': round(best_rmse, 4),
            'r2': round(best_r2, 4),
            'mae': round(best_mae, 4),
            'intercept': round(float(best_model.intercept_), 4),
            'coefficients': coef_dict
        })
        
    # 找出全域最佳泛化點（以未四捨五入的原始 float RMSE 判定最低點）
    optimal_k = min(range(len(steps)), key=lambda i: steps[i]['raw_rmse']) + 1
    opt_step = steps[optimal_k - 1]
    opt_feats = opt_step['selected_features']
    opt_m = LinearRegression().fit(X_train[opt_feats], y_train)
    yp_opt = opt_m.predict(X_test[opt_feats])
    
    test_samples = []
    for actual, pred in zip(y_test, yp_opt):
        test_samples.append({
            'actual': round(float(actual), 2),
            'predicted': round(float(pred), 2),
            'residual': round(float(actual - pred), 2)
        })
        
    # 動態產生 What-If 模擬器所需之關鍵特徵參數
    f1 = opt_feats[0]
    min1 = float(X[f1].min())
    max1 = float(X[f1].max())
    span1 = max1 - min1
    step1 = round(span1 / 50, 2) if span1 > 0 else 0.1
    default1 = round(float(X[f1].median()), 2)
    
    sim_config = {
        'is_generic': True,
        'input1': {
            'name': f1,
            'label': f"重要特徵 1：{f1}",
            'min': round(min1, 2),
            'max': round(max1, 2),
            'step': step1 if step1 > 0 else 0.1,
            'default': default1,
            'prefix': '',
            'suffix': ''
        }
    }
    
    if len(opt_feats) > 1:
        f2 = opt_feats[1]
        min2 = float(X[f2].min())
        max2 = float(X[f2].max())
        span2 = max2 - min2
        step2 = round(span2 / 50, 2) if span2 > 0 else 0.1
        default2 = round(float(X[f2].median()), 2)
        sim_config['input2'] = {
            'name': f2,
            'label': f"重要特徵 2：{f2}",
            'min': round(min2, 2),
            'max': round(max2, 2),
            'step': step2 if step2 > 0 else 0.1,
            'default': default2,
            'prefix': '',
            'suffix': ''
        }
    else:
        sim_config['input2'] = sim_config['input1']
        
    return json.dumps({
        'id': 'custom',
        'title': f'自訂資料集 ({target_col} 預測)',
        'description': f'針對自訂上傳之 CSV 資料集執行前向逐步特徵選取與多元回歸分析，目標預測變數為「{target_col}」，共完成 {len(steps)} 項候選特徵評估。',
        'unit_label': target_col,
        'value_prefix': '',
        'value_suffix': '',
        'total_features': len(steps),
        'optimal_k': optimal_k,
        'steps': steps,
        'optimal_model': {
            'features': opt_feats,
            'intercept': round(float(opt_m.intercept_), 4),
            'coefficients': {f: round(float(c), 4) for f, c in zip(opt_feats, opt_m.coef_)},
            'rmse': round(opt_step['rmse'], 4),
            'r2': round(opt_step['r2'], 4)
        },
        'test_samples': test_samples[:20],
        'simulator': sim_config,
        'clean_note': ' '.join(clean_notes) if clean_notes else None
    }, ensure_ascii=False)

output_json = execute_regression(py_csv_input, py_target_col)
output_json
`;

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

// 疾速第一列表頭解析（絕不全文切割大檔案）
function parseCSVHeaders(csvText) {
  if (!csvText) return [];
  const firstNewline = csvText.indexOf('\n');
  const firstLine = firstNewline !== -1 ? csvText.slice(0, firstNewline) : csvText;
  return parseCSVLine(firstLine.replace(/\r$/, ''));
}

function initCustomDatasetUploader() {
  const dropzone = document.getElementById('csv-dropzone');
  const fileInput = document.getElementById('csv-file-input');
  const browseBtn = document.getElementById('btn-browse-file');
  const textArea = document.getElementById('csv-text-input');
  const sampleBtn = document.getElementById('btn-load-sample');
  const targetSelect = document.getElementById('custom-target-select');
  const configBar = document.getElementById('custom-config-bar');
  const detectedInfo = document.getElementById('config-detected-info');
  const runBtn = document.getElementById('btn-run-analysis');
  const errorBox = document.getElementById('custom-error-box');
  const errorTitle = document.getElementById('custom-error-title');
  const errorDesc = document.getElementById('custom-error-desc');
  const noticeBox = document.getElementById('custom-notice-box');
  const noticeDesc = document.getElementById('custom-notice-desc');
  const statusText = document.getElementById('engine-status-text');
  const statusDot = document.querySelector('.engine-status .status-dot');

  // 記憶體中儲存完整 CSV 內容，避免塞爆 DOM <textarea>
  let loadedCSVData = '';
  let currentHeaders = [];

  function setStatus(text, type = 'normal') {
    if (statusText) statusText.textContent = text;
    if (statusDot) {
      statusDot.className = 'status-dot';
      if (type === 'loading') statusDot.classList.add('loading');
      if (type === 'active') statusDot.classList.add('active');
      if (type === 'error') statusDot.classList.add('error');
    }
  }

  function showError(title, msg) {
    if (errorBox) {
      errorTitle.textContent = title;
      errorDesc.textContent = msg;
      errorBox.style.display = 'flex';
    }
    if (noticeBox) noticeBox.style.display = 'none';
    setStatus('資料檢核未通過', 'error');
  }

  function hideAlerts() {
    if (errorBox) errorBox.style.display = 'none';
    if (noticeBox) noticeBox.style.display = 'none';
  }

  function updateColumnDetection(headers) {
    hideAlerts();
    currentHeaders = headers || [];
    if (!currentHeaders || currentHeaders.length < 2) {
      configBar.style.display = 'none';
      runBtn.disabled = true;
      setStatus('CSV 表頭欄位不足（至少需 1 個特徵欄位與 1 個目標欄位）', 'error');
      return;
    }

    // Populate Select Options
    targetSelect.innerHTML = '';
    currentHeaders.forEach((h, idx) => {
      // 略過純空白或未命名之索引欄位
      if (!h || h.startsWith('Unnamed:')) return;
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = `${h} ${idx === currentHeaders.length - 1 ? '(預設)' : ''}`;
      if (idx === currentHeaders.length - 1) opt.selected = true;
      targetSelect.appendChild(opt);
    });

    configBar.style.display = 'flex';
    runBtn.disabled = false;
    renderColumnBadges();
    setStatus('CSV 資料已就緒，可點擊「開始分析」');
  }

  function renderColumnBadges() {
    const selectedTarget = targetSelect.value;
    detectedInfo.innerHTML = '';

    currentHeaders.forEach(h => {
      if (!h || h.startsWith('Unnamed:')) return;
      const badge = document.createElement('span');
      badge.className = 'col-badge' + (h === selectedTarget ? ' target' : '');
      badge.textContent = h === selectedTarget ? `🎯 目標: ${h}` : `特徵: ${h}`;
      detectedInfo.appendChild(badge);
    });
  }

  targetSelect.addEventListener('change', renderColumnBadges);

  // File Drop Handlers
  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    dropzone.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFile(file);
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    });
  }

  function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showError('檔案格式不符', '請上傳 .csv 格式之檔案！');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      loadedCSVData = e.target.result;

      // 關鍵效能優化：大檔案絕不全文注入 DOM <textarea>，改用唯讀預覽模式保護完整資料
      if (loadedCSVData.length > 30000) {
        let previewEnd = 0;
        for (let count = 0; count < 25 && previewEnd !== -1; count++) {
          previewEnd = loadedCSVData.indexOf('\n', previewEnd + 1);
        }
        const previewSlice = previewEnd !== -1 ? loadedCSVData.slice(0, previewEnd) : loadedCSVData.slice(0, 5000);
        textArea.value = `${previewSlice}\n\n... [已載入檔案：${file.name}，大小 ${(file.size / (1024 * 1024)).toFixed(1)} MB。已自動啟用唯讀預覽模式以保護完整資料並確保瀏覽器極致反應速度]`;
        textArea.readOnly = true;
      } else {
        textArea.value = loadedCSVData;
        textArea.readOnly = false;
      }

      currentHeaders = parseCSVHeaders(loadedCSVData);
      updateColumnDetection(currentHeaders);
    };
    reader.readAsText(file);
  }

  // Textarea input event
  if (textArea) {
    textArea.addEventListener('input', () => {
      if (textArea.readOnly) return;
      loadedCSVData = textArea.value;
      currentHeaders = parseCSVHeaders(loadedCSVData);
      updateColumnDetection(currentHeaders);
    });
  }

  // Sample CSV Button
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      textArea.readOnly = false;
      loadedCSVData = SAMPLE_CSV;
      textArea.value = SAMPLE_CSV;
      currentHeaders = parseCSVHeaders(SAMPLE_CSV);
      updateColumnDetection(currentHeaders);
    });
  }

  // Run Analysis Button Event
  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      const csvContent = loadedCSVData.trim();
      const targetCol = targetSelect.value;

      if (!csvContent) {
        showError('無資料內容', '請先貼上或上傳 CSV 內容。');
        return;
      }

      hideAlerts();
      runBtn.disabled = true;
      setStatus('正在啟動 Python WebAssembly 執行環境...', 'loading');

      try {
        const py = await getPyodideInstance((msg) => setStatus(msg, 'loading'));
        setStatus('正在執行前向特徵選取與多元回歸分析...', 'loading');

        // Pass variables to Python
        py.globals.set('py_csv_input', csvContent);
        py.globals.set('py_target_col', targetCol);

        // Run Python Script
        const resultJsonStr = await py.runPythonAsync(PYTHON_ANALYSIS_SCRIPT);
        const result = JSON.parse(resultJsonStr);

        if (result.error) {
          showError('資料檢驗未通過', result.error);
          runBtn.disabled = false;
          return;
        }

        // 智慧容錯清理提示反饋
        if (result.clean_note && noticeBox) {
          noticeDesc.textContent = result.clean_note;
          noticeBox.style.display = 'flex';
        }

        // Store into global datasets
        allData.datasets.custom = result;
        setStatus('✅ 分析完成！已即時更新下方儀表板與 What-If 模擬器。', 'active');
        runBtn.disabled = false;

        // Switch and display
        switchDataset('custom');

        // Smooth scroll to feature selection section
        const resultSection = document.getElementById('section-feature-selection');
        if (resultSection) {
          resultSection.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {
        console.error('Pyodide execution error:', err);
        showError('運算執行錯誤', `Python 執行期間發生未預期錯誤：${err.message || err}`);
        setStatus('運算發生錯誤', 'error');
        runBtn.disabled = false;
      }
    });
  }
}
