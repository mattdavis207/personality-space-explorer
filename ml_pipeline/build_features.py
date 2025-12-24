import pandas as pd 
import numpy as np
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import make_column_transformer
from sklearn.impute import SimpleImputer 

df = pd.read_csv("data/mbti_celebrities.csv")

# first clean null values for important features
df_clean = df[
    df["four_letter"].notna() &
    df["letter_1_percentage"].notna() &
    df["letter_2_percentage"].notna() &
    df["letter_3_percentage"].notna() &
    df["letter_4_percentage"].notna()
]


# imputer = SimpleImputer(strategy='constant' =fill_value='Unknown')
# df_clean['enneagram'] = imputer.fit_transform(df_clean[['enneagram']]).ravel()

# Fill missing values
df_clean["enneagram_main"] = df_clean["enneagram"].str.extract(r"(\d)")
df_clean['enneagram_main'] = df_clean['enneagram_main'].fillna('unknown')

def mbti_continuous_axis_encoding(letter, percentage):
    if letter == "E":
        return -percentage
    elif letter == 'I':
        return percentage
    elif letter == 'S':
        return -percentage 
    elif letter == 'N':
        return percentage
    elif letter == 'T':
        return -percentage
    elif letter == 'F':
        return percentage
    elif letter == 'J':
        return -percentage
    elif letter == 'P':
        return percentage


df_clean['axis_EI'] = df_clean.apply(
        lambda row: mbti_continuous_axis_encoding(row['letter_1'], row['letter_1_percentage']),
        axis=1
)

df_clean['axis_SN'] =df_clean.apply(
        lambda row: mbti_continuous_axis_encoding(row['letter_2'], row['letter_2_percentage']),
        axis=1
)
df_clean['axis_TF'] = df_clean.apply(
        lambda row: mbti_continuous_axis_encoding(row['letter_3'], row['letter_3_percentage']),
        axis=1
)
df_clean['axis_JP'] = df_clean.apply(
        lambda row: mbti_continuous_axis_encoding(row['letter_4'], row['letter_4_percentage']),
        axis=1
)




df_clean['big_5_SLOAN'] = df_clean['big_5_SLOAN'].fillna('XXXXX')

# big sloan continuous axis columns
df_clean['axis_SR'] = np.where(df_clean['big_5_SLOAN'].str[0] == 'S', 1, -1)
df_clean['axis_CL'] = np.where(df_clean['big_5_SLOAN'].str[1] == 'C', 1, -1)
df_clean['axis_OU'] = np.where(df_clean['big_5_SLOAN'].str[2] == 'O', 1, -1)
df_clean['axis_AE'] = np.where(df_clean['big_5_SLOAN'].str[3] == 'A', 1, -1)
df_clean['axis_IN'] = np.where(df_clean['big_5_SLOAN'].str[4] == 'I', 1, -1)

df_clean['socionics'] = df_clean['socionics'].fillna('Unknown')

# Apply preprocessor: one-hot encode categorical, keep continuous axes
preprocessor = make_column_transformer(
    (OneHotEncoder(handle_unknown='ignore'), ['enneagram_main', 'socionics']),
    remainder='passthrough'
)

# Select features to transform
feature_cols = ['enneagram_main', 'socionics', 'axis_EI', 'axis_SN', 'axis_TF', 'axis_JP',
                'axis_SR', 'axis_CL', 'axis_OU', 'axis_AE', 'axis_IN']

X = preprocessor.fit_transform(df_clean[feature_cols])

# Save features and metadata
metadata = df_clean[['id', 'name', 'category', 'subcategory', 'four_letter',
                      'enneagram', 'socionics', 'big_5_SLOAN']].reset_index(drop=True)

# convert to df
import os
os.makedirs('artifacts', exist_ok=True)

# get feature names from the preprocessor
feature_names = preprocessor.get_feature_names_out()

# saving to parquet files for use in other scripts in the pipeline
X_df = pd.DataFrame(X, columns=feature_names)
X_df.to_parquet('artifacts/features.parquet', index=False)
metadata.to_parquet('artifacts/metadata.parquet', index=False)

print(f"Features saved: {X.shape}")
print(f"Metadata saved: {metadata.shape}")
print(f"\nFeature columns ({len(feature_names)}):")
print(list(feature_names), "...")

