import pandas as pd
import numpy as np
import hdbscan
from collections import Counter
import json

# Load embedding and metadata
embedding_df = pd.read_parquet("artifacts/embedding.parquet")
metadata = pd.read_parquet("artifacts/metadata.parquet")

print(f"Loaded embedding: {embedding_df.shape}")
print(f"Loaded metadata: {metadata.shape}")


clusterer = hdbscan.HDBSCAN(
    min_cluster_size=400,               
    min_samples=3, # more permissive here
    approx_min_span_tree=True,
    metric='euclidean',
    cluster_selection_epsilon=0.5, # merges close clusters
    prediction_data=True # soft clustering for noise
)

cluster_labels = clusterer.fit_predict(embedding_df)

# save cluster labels
cluster_df = pd.DataFrame(cluster_labels, columns=['cluster_id'])
cluster_df.to_parquet("artifacts/clusters.parquet", index=False)

# get cluster statistics
unique_labels = set(cluster_labels)
n_clusters = len(unique_labels) - (1 if -1 in unique_labels else 0)
n_noise = list(cluster_labels).count(-1)

print("Clustering Results")
print(f"Total clusters: {n_clusters}")
print(f"Noise points: {n_noise} ({n_noise/len(cluster_labels)*100:.1f}%)")
print(f"Clustered points: {len(cluster_labels) - n_noise}")

# count points per cluster
cluster_counts = Counter(cluster_labels)

print(f"\nCluster sizes:")
for label in sorted(unique_labels):
    if label == -1:
        print(f"  Noise count: {cluster_counts[label]:,} points")
    else:
        print(f"  Cluster count{label}: {cluster_counts[label]:,} points")


# generate clustering metadata

cluster_metadata = []

for cluster_id in sorted(unique_labels):
    if cluster_id == -1:
        continue  # skipping outliers here

    # get points in this cluster
    mask = cluster_labels == cluster_id
    cluster_points = embedding_df[mask]
    cluster_meta = metadata[mask]

    # calculate centroid
    centroid = cluster_points.mean().tolist()

    # get top personality types in this cluster
    top_mbti = cluster_meta['four_letter'].value_counts().head(3).to_dict()
    top_enneagram = cluster_meta['enneagram'].value_counts().head(3).to_dict()

    # get top cats
    top_categories = cluster_meta['category'].value_counts().head(3).to_dict()

    # get top subcategories
    top_subcategories = cluster_meta['subcategory'].value_counts().head(10).to_dict()

    cluster_metadata.append({
        'cluster_id': int(cluster_id),
        'size': int(cluster_counts[cluster_id]),
        'centroid': centroid,
        'top_mbti': top_mbti,
        'top_enneagram': top_enneagram,
        'top_categories': top_categories,
        'top_subcategories': top_subcategories,
        'percentage': float(cluster_counts[cluster_id] / len(cluster_labels) * 100)
    })

# save cluster metadata
with open('artifacts/cluster_metadata.json', 'w') as f:
    json.dump(cluster_metadata, f, indent=2)

print(f"\nSaved:")
print(f"clusters.parquet ({len(cluster_labels):,} labels)")
print(f"cluster_metadata.json ({len(cluster_metadata)} clusters)")

# print sample metadata
print(f"\nSample cluster metadata:")
for cluster in cluster_metadata[:3]:
    print(f"\nCluster {cluster['cluster_id']}:")
    print(f"  Size: {cluster['size']:,} ({cluster['percentage']:.1f}%)")
    print(f"  Top MBTI: {list(cluster['top_mbti'].keys())[:3]}")
    print(f"  Top Enneagram: {list(cluster['top_enneagram'].keys())[:3]}")