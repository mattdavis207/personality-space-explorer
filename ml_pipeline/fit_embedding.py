import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import umap
from sklearn.decomposition import PCA 

X = pd.read_parquet("artifacts/features.parquet")
metadata = pd.read_parquet("artifacts/metadata.parquet")

print(f"X shape: {X.shape}")

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# PCA dimensionality reduction to preserve 90% variance
pca = PCA(n_components=0.90)
X_pca = pca.fit_transform(X_scaled)

print(f"PCA components used: {pca.n_components_}")
print(f"Explained variance: {pca.explained_variance_ratio_}")

# next perform UMAP to reduce the priciple component analysis down to 3 dimensions
reducer = umap.UMAP(
    n_components=3,
    n_neighbors=30,
    min_dist=0.1,
    metric='euclidean',
    random_state=42
)

X_umap = reducer.fit_transform(X_pca)

print(f"UMAP embedding: {X_umap.shape}")

# save embedding
embedding_df = pd.DataFrame(
    X_umap,
    columns=['x', 'y', 'z']
)

embedding_df.to_parquet('../artifacts/embedding.parquet', index=False)


print(f"Embedding saved: {embedding_df.shape}")

