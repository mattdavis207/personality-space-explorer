/* eslint-disable no-unused-vars */
import { useEffect, useState } from 'react';
import { parquetRead } from 'hyparquet';



export function useParquetData(url, returnObjects = false) {
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

              if (returnObjects) {
                // Return as-is for metadata files
                console.log('Loaded object data:', parquetData.length, 'rows. First row:', parquetData[0]);

                // Check if data is already objects or needs conversion from arrays
                if (Array.isArray(parquetData[0])) {
                  // Data came as arrays, need to convert using column names
                  const keys = Object.keys(parquetData[0]);
                  const properRecords = parquetData.map(row => {
                    const obj = {};
                    keys.forEach(key => {
                      obj[key] = row[key];
                    });
                    return obj;
                  });
                  console.log('Converted array to object. First record:', properRecords[0]);
                  setData(properRecords);
                } else {
                  setData(parquetData);
                }
              } else {
                // get actual column names
                const keys = Object.keys(parquetData[0]);

                // convert to array of 3d arrays using keys
                const records = parquetData.map(row => [
                  row[keys[0]],
                  row[keys[1]],
                  row[keys[2]]
                ]);

                setData(records);
              }
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
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const jsonData = await response.json();
        setData(jsonData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    readData();
  }, [url]);

  return { data, loading, error };
}

