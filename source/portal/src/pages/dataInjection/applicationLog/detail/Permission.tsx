/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import React, { useState, useEffect } from "react";
import { AppPipeline, PipelineStatus, SubAccountLink } from "API";
import HeaderPanel from "components/HeaderPanel";
import Alert from "components/Alert";
import ExtLink from "components/ExtLink";
import { AmplifyConfigType } from "types";
import { AppStateProps } from "reducer/appReducer";
import { useSelector } from "react-redux";
import { GRANT_EC2_PERMISSION_LINK } from "assets/js/const";
import { useTranslation } from "react-i18next";
import CodeCopy from "components/CodeCopy";
import { appSyncRequestQuery } from "assets/js/request";
import { listSubAccountLinks } from "graphql/queries";
import LoadingText from "components/LoadingText";

interface PermissionProps {
  pipelineInfo: AppPipeline | undefined;
}

const PAGE_SIZE = 999;

const Permission: React.FC<PermissionProps> = (props: PermissionProps) => {
  const { pipelineInfo } = props;
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: AppStateProps) => state.amplifyConfig
  );
  const { t } = useTranslation();
  const [jsonData, setJsonData] = useState("");
  const [loadingData, setLoadingData] = useState(false);

  let ARN_AWS = "aws";
  if (amplifyConfig.aws_project_region.startsWith("cn")) {
    ARN_AWS = "aws-cn";
  }

  const buildPermissionJSON = (accountList: SubAccountLink[]) => {
    const getObjectResources = [
      `arn:${ARN_AWS}:s3:::${amplifyConfig.default_logging_bucket}`,
      `arn:${ARN_AWS}:s3:::${amplifyConfig.default_logging_bucket}/*`,
    ];
    let kdsPermissionObj: any = {
      Effect: "Allow",
      Action: ["kinesis:PutRecord", "kinesis:PutRecords"],
      Resource: `arn:${ARN_AWS}:kinesis:${amplifyConfig.aws_project_region}:<YOUR ACCOUNT ID>:stream/${pipelineInfo?.bufferResourceName}`,
    };
    if (accountList && accountList.length > 0) {
      accountList.forEach((element) => {
        getObjectResources.push(
          `arn:${ARN_AWS}:s3:::${element.subAccountBucketName}`
        );
        getObjectResources.push(
          `arn:${ARN_AWS}:s3:::${element.subAccountBucketName}/*`
        );
      });
    }
    if (pipelineInfo?.bufferAccessRoleArn) {
      let roleARN = [];
      const roleSplitArr = pipelineInfo.bufferAccessRoleArn.split(":role/");
      if (roleSplitArr.length > 1) {
        roleARN = [
          `${roleSplitArr[0]}:role/*DataBufferKDSRole*`,
          `${roleSplitArr[0]}:role/*BufferAccessRole*`,
          `${roleSplitArr[0]}:role/AOS-Agent*`,
        ];
        kdsPermissionObj = {
          Sid: "VisualEditor1",
          Effect: "Allow",
          Action: "sts:AssumeRole",
          Resource: roleARN,
        };
      }
    }
    const permissionJSON: any = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "VisualEditor0",
          Effect: "Allow",
          Action: "s3:GetObject",
          Resource: getObjectResources,
        },
        kdsPermissionObj,
        {
          Effect: "Allow",
          Action: [
            "cloudwatch:PutMetricData",
            "ds:CreateComputer",
            "ds:DescribeDirectories",
            "ec2:DescribeInstanceStatus",
            "ssm:GetConnectionStatus",
            "ssm:DescribeDocument",
            "ssm:ListCommands",
            "ssm:ListDocumentVersions",
            "ssm:DescribeInstanceInformation",
            "ssm:DescribeDocumentParameters",
            "ssm:GetDocument",
            "ssm:GetParameter",
            "ssm:GetParameters",
            "ssm:GetCommandInvocation",
            "ssm:DescribeDocumentPermission",
            "ssm:UpdateInstanceInformation",
            "ssm:ListDocuments",
            "ssm:ListCommandInvocations",
            "ssm:RegisterManagedInstance",
            "ssm:DescribeInstanceProperties",
            "ec2:DescribeInstanceStatus",
            "ssm:GetConnectionStatus",
          ],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: "iam:CreateServiceLinkedRole",
          Resource: `arn:${ARN_AWS}:iam::*:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM*`,
          Condition: {
            StringLike: {
              "iam:AWSServiceName": "ssm.amazonaws.com",
            },
          },
        },
        {
          Effect: "Allow",
          Action: [
            "iam:DeleteServiceLinkedRole",
            "iam:GetServiceLinkedRoleDeletionStatus",
          ],
          Resource: `arn:${ARN_AWS}:iam::*:role/aws-service-role/ssm.amazonaws.com/AWSServiceRoleForAmazonSSM*`,
        },
        {
          Effect: "Allow",
          Action: [
            "ssmmessages:CreateControlChannel",
            "ssmmessages:CreateDataChannel",
            "ssmmessages:OpenControlChannel",
            "ssmmessages:OpenDataChannel",
          ],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: [
            "ec2messages:GetEndpoint",
            "ec2messages:AcknowledgeMessage",
            "ec2messages:SendReply",
            "ec2messages:GetMessages",
          ],
          Resource: "*",
        },
      ],
    };
    return permissionJSON;
  };

  // Get Member Account List
  const getCrossAccountList = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(listSubAccountLinks, {
        page: 1,
        count: PAGE_SIZE,
      });
      console.info("resData:", resData);
      const dataLogAccountList: SubAccountLink[] =
        resData.data.listSubAccountLinks.subAccountLinks;
      setLoadingData(false);
      const tmpPermissionJSON = buildPermissionJSON(dataLogAccountList);
      setJsonData(JSON.stringify(tmpPermissionJSON, null, 2));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getCrossAccountList();
  }, []);

  return (
    <div>
      <HeaderPanel title={t("applog:detail.permission.name")}>
        {pipelineInfo?.status !== PipelineStatus.ACTIVE ? (
          <div>{t("applog:detail.permission.notYet")}</div>
        ) : (
          <div>
            {loadingData ? (
              <LoadingText />
            ) : (
              <>
                <Alert
                  title={t("applog:detail.permission.alert")}
                  content={
                    <div>
                      {t("applog:detail.permission.alertDesc")}
                      <ExtLink to={GRANT_EC2_PERMISSION_LINK}>
                        {t("applog:detail.permission.grant")}
                      </ExtLink>
                    </div>
                  }
                />
                <CodeCopy code={jsonData} />
              </>
            )}
          </div>
        )}
      </HeaderPanel>
    </div>
  );
};

export default Permission;
