#!/usr/bin/env python3
"""
Convert Parquet files to JSON for React Native mobile app.

This script reads the existing Parquet files and converts them to JSON format
that can be easily loaded in React Native without Node.js dependencies.
"""

import pandas as pd
import json
import os
from pathlib import Path

def convert_parquet_to_json(parquet_path, json_path):
    """Convert a Parquet file to JSON format."""
    print(f"Converting {parquet_path} to {json_path}...")

    # Read the Parquet file
    df = pd.read_parquet(parquet_path)

    # Convert to list of lists (more compact than list of objects for large datasets)
    data = df.values.tolist()

    # Write to JSON file
    with open(json_path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))  # Compact JSON format

    file_size_mb = os.path.getsize(json_path) / (1024 * 1024)
    print(f"  ✓ Created {json_path} ({file_size_mb:.2f} MB)")
    print(f"  ✓ Rows: {len(data)}, Columns: {len(data[0]) if data else 0}")

def main():
    # Define paths
    project_root = Path(__file__).parent.parent
    artifacts_dir = project_root / "artifacts"

    # Files to convert
    files_to_convert = [
        "embedding.parquet",
        "clusters.parquet",
        "metadata.parquet"
    ]

    print("=" * 60)
    print("Parquet to JSON Conversion for Mobile App")
    print("=" * 60)
    print()

    # Convert each file
    for filename in files_to_convert:
        parquet_path = artifacts_dir / filename
        json_path = artifacts_dir / filename.replace('.parquet', '.json')

        if not parquet_path.exists():
            print(f"⚠️  Warning: {parquet_path} not found, skipping...")
            continue

        try:
            convert_parquet_to_json(parquet_path, json_path)
        except Exception as e:
            print(f"✗ Error converting {filename}: {e}")
        print()

    # Copy cluster_metadata.json (already in JSON format)
    cluster_metadata_path = artifacts_dir / "cluster_metadata.json"
    if cluster_metadata_path.exists():
        print(f"✓ cluster_metadata.json already exists (no conversion needed)")
    else:
        print(f"⚠️  Warning: cluster_metadata.json not found")

    print()
    print("=" * 60)
    print("Conversion complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. The JSON files are now in the artifacts/ directory")
    print("2. Your mobile app will automatically load these files")
    print("3. Test the app with: cd apps/mobile && npm start")

if __name__ == "__main__":
    main()
