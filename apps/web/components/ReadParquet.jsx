/* eslint-disable no-unused-vars */
import { useEffect, useState } from 'react';
import { parquetRead } from 'hyparquet';



export function useParquetData(url) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const readData = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        const result = await parquetRead({
          file: arrayBuffer,
          onComplete: (parquetData) => {

            // parquetData is already in row format - array of objects
            if (Array.isArray(parquetData) && parquetData.length > 0) {

              // get actual column names
              const keys = Object.keys(parquetData[0]);

              // convert to array of 3d arrays using keys
              const records = parquetData.map(row => [
                row[keys[0]],
                row[keys[1]],
                row[keys[2]]
              ]);

              setData(records);
              setLoading(false);
            } else {
              setLoading(false);
            }
          },
        });

      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    readData();
  }, [url]);

  return { data, loading, error };
}

