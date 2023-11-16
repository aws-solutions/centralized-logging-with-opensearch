/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useState, useEffect } from "react";
import LoadingText from "components/LoadingText";
import { Link } from "react-router-dom";
import { SubAccountLink } from "API";
import { getSubAccountLink } from "graphql/queries";
import { appSyncRequestQuery } from "assets/js/request";

interface AccouNameProps {
  accountId?: string;
  region?: string;
}

const AccountName: React.FC<AccouNameProps> = (props: AccouNameProps) => {
  const { accountId, region } = props;
  const [loadingData, setLoadingData] = useState(false);
  const [curAccount, setCurAccount] = useState<SubAccountLink>();

  const getAccountByIdAndRegion = async () => {
    setLoadingData(true);
    try {
      const resData: any = await appSyncRequestQuery(getSubAccountLink, {
        subAccountId: accountId || "",
        region: region,
      });
      console.info("resData:", resData);
      if (
        resData.data &&
        resData.data.getSubAccountLink &&
        resData.data.getSubAccountLink.subAccountId
      ) {
        setCurAccount(resData.data.getSubAccountLink);
      }
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (accountId && region) {
      getAccountByIdAndRegion();
    }
  }, [accountId, region]);

  return (
    <div>
      {loadingData ? (
        <LoadingText />
      ) : (
        <>
          {curAccount ? (
            <Link
              to={`/resources/cross-account/detail/${curAccount?.subAccountId}`}
            >
              {curAccount?.subAccountName}
            </Link>
          ) : (
            "-"
          )}
        </>
      )}
    </div>
  );
};

export default AccountName;
