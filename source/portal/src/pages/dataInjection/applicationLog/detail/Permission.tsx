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
import { SubAccountLink } from "API";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import CodeCopy from "components/CodeCopy";
import { appSyncRequestQuery } from "assets/js/request";
import { listSubAccountLinks } from "graphql/queries";
import LoadingText from "components/LoadingText";
import { generateEc2Permissions, getAWSPartition } from "assets/js/utils";
import { RootState } from "reducer/reducers";

const PAGE_SIZE = 999;

const Permission: React.FC = () => {
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const awsPartition = getAWSPartition(amplifyConfig.aws_project_region);
  const accountId = amplifyConfig.default_cmk_arn.split(":")[4];
  const [jsonData, setJsonData] = useState("");
  const [loadingData, setLoadingData] = useState(false);

  // Get Member Account List
  const getCrossAccountList = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(listSubAccountLinks, {
        page: 1,
        count: PAGE_SIZE,
      });
      console.info("resData:", resData);
      const accountList: SubAccountLink[] =
        resData.data.listSubAccountLinks?.subAccountLinks || [];
      setLoadingData(false);
      const getObjectResources = [
        `arn:${awsPartition}:s3:::${amplifyConfig.default_logging_bucket}`,
        `arn:${awsPartition}:s3:::${amplifyConfig.default_logging_bucket}/*`,
      ];
      if (accountList && accountList.length > 0) {
        accountList.forEach((element) => {
          getObjectResources.push(
            `arn:${awsPartition}:s3:::${element.subAccountBucketName}`
          );
          getObjectResources.push(
            `arn:${awsPartition}:s3:::${element.subAccountBucketName}/*`
          );
        });
      }
      const tmpPermissionJSON = generateEc2Permissions(
        awsPartition,
        accountId,
        getObjectResources
      );
      setJsonData(tmpPermissionJSON);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getCrossAccountList();
  }, []);

  return (
    <div>
      {loadingData ? (
        <LoadingText />
      ) : (
        <>
          <CodeCopy code={jsonData} />
        </>
      )}
    </div>
  );
};

export default Permission;
