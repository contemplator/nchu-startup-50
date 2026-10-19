import os
import json
import pandas as pd
import numpy as np
import requests
from io import StringIO
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

os.makedirs('web', exist_ok=True)

url = 'https://raw.githubusercontent.com/harimittapalli/Mulitple-Linear-Reggression/master/50_Startups.csv'
data = pd.read_csv(StringIO(requests.get(url).text))

# 1. Pearson Correlation
numeric_df = data.select_dtypes(include=[np.number])
corr = numeric_df.corr().to_dict()

# 2. Preprocess & Split
X = pd.get_dummies(data.drop('Profit', axis=1), columns=['State'], drop_first=True)
y = data['Profit']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=0)

# 3. Forward Selection
selected = []
steps = []

for i in range(1, len(X_train.columns) + 1):
    candidates = [c for c in X_train.columns if c not in selected]
    best_rmse, best_r2, best_mae, best_f = np.inf, -np.inf, np.inf, None
    best_model = None
    
    for f in candidates:
        features_to_use = selected + [f]
        m = LinearRegression()
        m.fit(X_train[features_to_use], y_train)
        yp = m.predict(X_test[features_to_use])
        rmse = float(np.sqrt(mean_squared_error(y_test, yp)))
        r2 = float(r2_score(y_test, yp))
        mae = float(mean_absolute_error(y_test, yp))
        
        if rmse < best_rmse:
            best_rmse = rmse
            best_r2 = r2
            best_mae = mae
            best_f = f
            best_model = m
            
    selected.append(best_f)
    coef_dict = {feat: float(coef) for feat, coef in zip(selected, best_model.coef_)}
    
    steps.append({
        'step': i,
        'selected_features': list(selected),
        'added_feature': best_f,
        'rmse': round(best_rmse, 6),
        'r2': round(best_r2, 6),
        'mae': round(best_mae, 6),
        'intercept': round(float(best_model.intercept_), 4),
        'coefficients': coef_dict
    })

# 4. Optimal Model (2 Features: R&D, Marketing)
opt_m = LinearRegression()
opt_m.fit(X_train[['R&D Spend', 'Marketing Spend']], y_train)
y_pred_opt = opt_m.predict(X_test[['R&D Spend', 'Marketing Spend']])

test_samples = []
for actual, pred in zip(y_test, y_pred_opt):
    test_samples.append({
        'actual': round(float(actual), 2),
        'predicted': round(float(pred), 2),
        'residual': round(float(actual - pred), 2)
    })

export_payload = {
    'dataset_summary': {
        'total_samples': len(data),
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'features': list(X.columns)
    },
    'correlations': corr,
    'forward_selection_steps': steps,
    'optimal_model': {
        'features': ['R&D Spend', 'Marketing Spend'],
        'intercept': round(float(opt_m.intercept_), 2),
        'coefficients': {
            'R&D Spend': round(float(opt_m.coef_[0]), 4),
            'Marketing Spend': round(float(opt_m.coef_[1]), 4)
        },
        'formula': f'Profit = {opt_m.intercept_:.2f} + {opt_m.coef_[0]:.4f} * (R&D Spend) + {opt_m.coef_[1]:.4f} * (Marketing Spend)',
        'rmse': round(float(np.sqrt(mean_squared_error(y_test, y_pred_opt))), 2),
        'r2': round(float(r2_score(y_test, y_pred_opt)), 6)
    },
    'test_samples': test_samples
}

with open('web/data.json', 'w', encoding='utf-8') as f:
    json.dump(export_payload, f, indent=2, ensure_ascii=False)

print('Exported web/data.json successfully!')
