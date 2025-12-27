# Artifacts Explanation


### Explanation of Artifacts used in this project
- metadata.parquet- Contains all the meta information for each celebrity including name, category, subcategory, MBTI type, enneagram, socionics, and Big 5 SLOAN. (To be used in labeling for final rendering)
- features.parquet- contains the engineered features for use in dimensionality reduction and clustering pipeline which includes continuous axis columns for MBTI type and SLOAN, enneagram, and socionics. 
- embedding.parquet- contains the (x, y, z) coordinate points corresponding to every celebrity from the PCA and UMAP reduced dimensionality pipeline in fit_embedding.py. (To be used for final rendering)
- clusters.parquet- contains clustering labeling for rendering.
- cluster_metadata.json- contains the clustering metadata including top enneagram, top mbti types, top cateogories, top subcategories, size, id, centroid, and percentage for each cluster for labeling  