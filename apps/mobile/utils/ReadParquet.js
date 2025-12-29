import { useState, useEffect } from 'react';

// For React Native, we'll load pre-converted JSON files instead of Parquet
// Since hyparquet has Node.js dependencies that don't work in RN
export function useParquetData(url, returnObjects = false) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const readData = async () => {
      try {
        // Convert .parquet URLs to .json URLs for mobile
        const jsonUrl = url.replace('.parquet', '.json');

        const response = await fetch(jsonUrl);
        const jsonData = await response.json();

        if (returnObjects) {
          setData(jsonData);
        } else {
          // For embedding/cluster data, it's already in array format
          setData(jsonData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error reading data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    readData();
  }, [url, returnObjects]);

  return { data, loading, error };
}

export function useJsonData(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const readData = async () => {
      try {
        const response = await fetch(url);
        const jsonData = await response.json();
        setData(jsonData);
        setLoading(false);
      } catch (err) {
        console.error('Error reading JSON:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    readData();
  }, [url]);

  return { data, loading, error };
}
