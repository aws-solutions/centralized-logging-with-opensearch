import { useEffect, useState } from "react";

type DataGenerator<T> = () => PromiseLike<T> | null;

interface InternalThis<T> {
  dataPromise: PromiseLike<T> | null;
}

export interface Config<T> {
  onDataReady?: (data: T, lastData?: T | null) => T | void;
  onDataError?: (e: any) => any;
  cleanData?: boolean;
}

export function useAsyncData<T>(
  getData: DataGenerator<T>,
  deps: any[] = [],
  config: Config<T> = {}
) {
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<any>(null);
  const [data, setData] = useState<T>();
  const [lastData, setLastData] = useState<T | null | undefined>(null);
  const [internalThis] = useState<InternalThis<T>>({ dataPromise: null });
  const [reload, setReload] = useState(false);

  /* NOSONAR */ useEffect(() => {
    let mounted = true;

    const setLoadingState = (loading: boolean) => {
      setIsLoadingData(loading);
    };

    const handleData = async (dataPromise: PromiseLike<T>) => {
      try {
        setLoadingState(true);
        let currentData: T = await dataPromise;
        if (!mounted) return;

        const lastDataToBe = config.cleanData ? null : data;
        if (config.onDataReady) {
          const processedData = config.onDataReady(currentData, lastDataToBe);
          if (processedData !== undefined) {
            currentData = processedData;
          }
        }

        setLastData(lastDataToBe);
        setData(currentData);
        setDataError(null);
      } catch (error) {
        if (!mounted) return;

        let dataError = error;
        if (config.onDataError) {
          const processedError = config.onDataError(error);
          if (processedError !== undefined) {
            dataError = processedError;
          }
        }

        setDataError(dataError);
      } finally {
        if (mounted) {
          setLoadingState(false);
        }
      }
    };

    const initiateDataFetch = () => {
      const dataPromise: PromiseLike<T> | null = getData();
      if (!dataPromise || dataPromise === internalThis.dataPromise) {
        setLoadingState(false);
        return;
      }

      internalThis.dataPromise = dataPromise;
      handleData(dataPromise);
    };

    initiateDataFetch();

    return () => {
      mounted = false;
    };
  }, [...deps, reload]);

  return {
    data,
    isLoadingData,
    dataError,
    lastData,
    reloadData: () => setReload((prev) => !prev),
    clearData: () => setData(undefined),
  };
}
