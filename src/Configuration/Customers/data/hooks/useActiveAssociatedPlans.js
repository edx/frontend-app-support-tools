import { useState, useEffect, useCallback } from 'react';
import { logError } from '@edx/frontend-platform/logging';
import {
  getCustomerSubscriptions,
  getSubsidies,
} from '../utils';

const useActiveAssociatedPlans = (enterpriseId) => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({});
  const fetchData = useCallback(
    async () => {
      try {
        const [
          customerSubscriptionsResponse,
          subsidiesForCustomerResponse,
        ] = await Promise.all([
          getCustomerSubscriptions(enterpriseId),
          getSubsidies(enterpriseId),
        ]);
        subsidiesForCustomerResponse.some(subsidy => {
          if (subsidy.isActive) {
            setData(prevState => ({
              ...prevState,
              hasActiveSubsidies: true,
            }));
          }
          return null;
        });

        customerSubscriptionsResponse.results.some(subscription => {
          if (subscription.isActive) {
            setData(prevState => ({
              ...prevState,
              hasActiveSubscriptions: true,
            }));
          }
          return null;
        });
      } catch (error) {
        logError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [enterpriseId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
  };
};

export default useActiveAssociatedPlans;
