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
import {
  EKSDeployKind,
  CreateLogSourceMutationVariables,
  Resource,
  ResourceType,
  LogSourceType,
  LogSource,
  SubAccountLink,
} from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { buildEKSLink } from "assets/js/utils";
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import Select, { SelectItem } from "components/Select/select";
import { listLogSources, listResources } from "graphql/queries";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { InfoBarTypes } from "reducer/appReducer";
import { RootState } from "reducer/reducers";
import { AmplifyConfigType } from "types";

const EKS_LOG_AGENT_PATTERN_LIST: SelectItem[] = [
  { name: "DaemonSet", value: EKSDeployKind.DaemonSet },
  { name: "Sidecar", value: EKSDeployKind.Sidecar },
];

interface SpecifyEksSourceProps {
  eksClusterLogSource: CreateLogSourceMutationVariables;
  eksEmptyError: boolean;
  changeEksClusterSource: (EksClusterName: string) => void;
  changeEksLogAgentPattern: (pattern: EKSDeployKind) => void;
  changeCurAccount: (id: string, accountInfo: SubAccountLink | null) => void;
}

const SpecifyEksSource: React.FC<SpecifyEksSourceProps> = (
  props: SpecifyEksSourceProps
) => {
  const {
    eksClusterLogSource,
    eksEmptyError,
    changeEksClusterSource,
    changeEksLogAgentPattern,
    changeCurAccount,
  } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [curEks, setCurEks] = useState<string>("");
  const [loadingEksList, setLoadingEksList] = useState(false);
  const [eksOptionList, setEksOptionList] = useState<SelectItem[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);

  const getEksClusterList = async () => {
    try {
      setEksOptionList([]);
      setLoadingEksList(true);

      const importedClusters: any = await appSyncRequestQuery(listLogSources, {
        type: LogSourceType.EKSCluster,
        page: 1,
        count: 999,
      });
      let filterAccountId = amplifyConfig.default_cmk_arn.split(":")[4];
      if (eksClusterLogSource.accountId) {
        filterAccountId = eksClusterLogSource.accountId;
      }
      const importedSourceList: LogSource[] =
        importedClusters?.data?.listLogSources?.logSources?.filter(
          (element: LogSource) => element.accountId === filterAccountId
        ) || [];
      const eksClusterNames = importedSourceList.map(
        (cluster) => cluster?.eks?.eksClusterName
      );
      const resData: any = await appSyncRequestQuery(listResources, {
        type: ResourceType.EKSCluster,
        accountId: eksClusterLogSource.accountId,
      });
      const dataList: Resource[] = resData.data.listResources;
      const tmpOptionList: SelectItem[] = [];
      dataList.forEach((element) => {
        tmpOptionList.push({
          name: `${element.name}`,
          value: element.id,
          optTitle: eksClusterNames.includes(element.id) ? "IMPORTED" : "",
          disabled: eksClusterNames.includes(element.id),
        });
      });
      setEksOptionList(tmpOptionList);
      setLoadingEksList(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setCurEks("");
    getEksClusterList();
  }, [eksClusterLogSource.accountId]);

  return (
    <div>
      <HeaderPanel title={t("ekslog:create.eksSource.eks")}>
        <div>
          <CrossAccountSelect
            disabled={loadingEksList}
            accountId={eksClusterLogSource.accountId as string}
            changeAccount={(id, accountInfo) => {
              changeCurAccount(id, accountInfo);
            }}
            loadingAccount={(loading) => {
              setLoadingAccount(loading);
            }}
          />
          <FormItem
            optionTitle={t("ekslog:create.eksSource.eksCluster")}
            optionDesc={
              <div>
                {t("ekslog:create.eksSource.eksClusterDesc")}
                <ExtLink to={buildEKSLink(amplifyConfig.aws_appsync_region)}>
                  {t("ekslog:create.eksSource.curAccount")}
                </ExtLink>
                .
              </div>
            }
            errorText={
              eksEmptyError ? t("ekslog:create.eksSource.eksClusterError") : ""
            }
          >
            <Select
              hasStatus
              disabled={loadingEksList || loadingAccount}
              className="m-w-75p"
              placeholder={t("ekslog:create.eksSource.chooseEksCluster")}
              loading={loadingEksList}
              optionList={eksOptionList}
              value={curEks}
              onChange={(event) => {
                setCurEks(event.target.value);
                changeEksClusterSource(event.target.value);
              }}
              hasRefresh
              clickRefresh={() => {
                getEksClusterList();
              }}
            />
          </FormItem>
          <FormItem
            infoType={InfoBarTypes.EKS_PATTERN}
            optionTitle={t("ekslog:create.eksSource.eksAgentPattern")}
            optionDesc={t("ekslog:create.eksSource.eksAgentPatternDesc")}
          >
            <Select
              className="m-w-75p"
              optionList={EKS_LOG_AGENT_PATTERN_LIST}
              value={eksClusterLogSource.eks?.deploymentKind as string}
              onChange={(event) => {
                changeEksLogAgentPattern(event.target.value);
              }}
            ></Select>
          </FormItem>
        </div>
      </HeaderPanel>
    </div>
  );
};

export default SpecifyEksSource;
