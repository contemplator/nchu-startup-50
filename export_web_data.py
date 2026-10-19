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

def process_dataset(name, X, y, optimal_feature_count, unit_label, value_prefix, value_suffix):
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42 if name != 'startups' else 0)
    
    selected = []
    steps = []
    
    for k in range(1, len(X.columns) + 1):
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
            'rmse': round(best_rmse, 6 if name == 'startups' else 4),
            'r2': round(best_r2, 6 if name == 'startups' else 4),
            'mae': round(best_mae, 4),
            'intercept': round(float(best_model.intercept_), 4),
            'coefficients': coef_dict
        })
        
    # Fit optimal model
    opt_step = steps[optimal_feature_count - 1]
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
        
    return {
        'id': name,
        'unit_label': unit_label,
        'value_prefix': value_prefix,
        'value_suffix': value_suffix,
        'total_features': len(X.columns),
        'optimal_k': optimal_feature_count,
        'steps': steps,
        'optimal_model': {
            'features': opt_feats,
            'intercept': round(float(opt_m.intercept_), 4),
            'coefficients': {f: round(float(c), 4) for f, c in zip(opt_feats, opt_m.coef_)},
            'rmse': round(opt_step['rmse'], 4),
            'r2': round(opt_step['r2'], 4)
        },
        'test_samples': test_samples[:15]  # Keep concise for web
    }

# ==========================================
# 1. 50_Startups
# ==========================================
print("Processing 50_Startups...")
url_startups = 'https://raw.githubusercontent.com/harimittapalli/Mulitple-Linear-Reggression/master/50_Startups.csv'
df_startups = pd.read_csv(StringIO(requests.get(url_startups).text))
X_startups = pd.get_dummies(df_startups.drop('Profit', axis=1), columns=['State'], drop_first=True)
y_startups = df_startups['Profit']

startups_payload = process_dataset(
    'startups', X_startups, y_startups, optimal_feature_count=2,
    unit_label='利潤 (Profit)', value_prefix='$', value_suffix=''
)
startups_payload['title'] = '50_Startups 新創公司利潤預測'
startups_payload['description'] = '探索研發支出、行銷支出與行政支出對新創利潤的邊際貢獻，展示典型的 2 特徵最佳泛化拐點。'
startups_payload['simulator'] = {
    'input1': {'id': 'rd', 'label': '研發支出 (R&D Spend)', 'min': 0, 'max': 200000, 'step': 5000, 'default': 120000, 'prefix': '$', 'suffix': ''},
    'input2': {'id': 'mkt', 'label': '行銷支出 (Marketing Spend)', 'min': 0, 'max': 500000, 'step': 10000, 'default': 250000, 'prefix': '$', 'suffix': ''},
    'calc_func': 'startups'
}

# ==========================================
# 2. Boston Housing
# ==========================================
print("Processing Boston Housing...")
url_boston = 'https://raw.githubusercontent.com/selva86/datasets/master/BostonHousing.csv'
df_boston = pd.read_csv(StringIO(requests.get(url_boston).text))
X_boston = df_boston.drop('medv', axis=1)
y_boston = df_boston['medv']

boston_payload = process_dataset(
    'boston', X_boston, y_boston, optimal_feature_count=5,
    unit_label='房價中位數 (medv)', value_prefix='$', value_suffix='k'
)
boston_payload['title'] = 'Boston Housing 波士頓房價預測'
boston_payload['description'] = '涵蓋犯罪率、每戶房間數、師生比與低收入人口比例等 13 項環境與社經指標之房價回歸模型。'
boston_payload['simulator'] = {
    'input1': {'id': 'rm', 'label': '平均房間數 (rm)', 'min': 3.5, 'max': 9.0, 'step': 0.1, 'default': 6.5, 'prefix': '', 'suffix': ' 間'},
    'input2': {'id': 'lstat', 'label': '低收入人口比 (lstat)', 'min': 1.0, 'max': 35.0, 'step': 0.5, 'default': 12.0, 'prefix': '', 'suffix': ' %'},
    'calc_func': 'boston'
}

# ==========================================
# 3. CarDekho Used Car Price
# ==========================================
print("Processing CarDekho...")
url_cardekho = 'https://raw.githubusercontent.com/amankharwal/Website-data/master/car%20data.csv'
df_cardekho = pd.read_csv(StringIO(requests.get(url_cardekho).text))
df_cardekho['Car_Age'] = 2026 - df_cardekho['Year']
X_raw_car = df_cardekho.drop(['Car_Name', 'Year', 'Selling_Price'], axis=1)
X_cardekho = pd.get_dummies(X_raw_car, columns=['Fuel_Type', 'Seller_Type', 'Transmission'], drop_first=True)
y_cardekho = df_cardekho['Selling_Price']

cardekho_payload = process_dataset(
    'cardekho', X_cardekho, y_cardekho, optimal_feature_count=6,
    unit_label='二手車售價 (Selling Price)', value_prefix='', value_suffix=' 萬盧比'
)
cardekho_payload['title'] = 'CarDekho 二手車價格預測'
cardekho_payload['description'] = '結合出廠車齡折舊與新車購買價、變速箱、燃料類型，量化中古車在自由市場的保值溢價。'
cardekho_payload['simulator'] = {
    'input1': {'id': 'present_price', 'label': '新車購買原價 (Present Price)', 'min': 1.0, 'max': 30.0, 'step': 0.5, 'default': 10.0, 'prefix': '', 'suffix': ' 萬盧比'},
    'input2': {'id': 'car_age', 'label': '車齡 (Car Age)', 'min': 1, 'max': 18, 'step': 1, 'default': 4, 'prefix': '', 'suffix': ' 年'},
    'calc_func': 'cardekho'
}

# Combine and write to web/data.json
combined_data = {
    'datasets': {
        'startups': startups_payload,
        'boston': boston_payload,
        'cardekho': cardekho_payload
    }
}

with open('web/data.json', 'w', encoding='utf-8') as f:
    json.dump(combined_data, f, indent=2, ensure_ascii=False)

print("Exported multi-dataset web/data.json successfully!")
