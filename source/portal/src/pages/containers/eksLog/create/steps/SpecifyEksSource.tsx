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
import { EKSDeployKind } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import { buildEKSLink } from "assets/js/utils";
import AutoComplete from "components/AutoComplete";
import ExtLink from "components/ExtLink";
import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import Select, { SelectItem } from "components/Select/select";
import { listEKSClusterNames } from "graphql/queries";
import CrossAccountSelect from "pages/comps/account/CrossAccountSelect";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AppStateProps, InfoBarTypes } from "reducer/appReducer";
import { AmplifyConfigType } from "types";
import { EKSClusterLogSourceType } from "../ImportEksCluster";

const EKS_LOG_AGENT_PATTERN_LIST: SelectItem[] = [
  { name: "DaemonSet", value: EKSDeployKind.DaemonSet },
  { name: "Sidecar", value: EKSDeployKind.Sidecar },
];

const EMPTY_EKS_SELECT_ITEM: SelectItem = {
  name: "",
  value: "",
};

interface SpecifyEksSourceProps {
  eksClusterLogSource: EKSClusterLogSourceType;
  eksEmptyError: boolean;
  changeEksClusterSource: (EksClusterName: string) => void;
  changeEksLogAgentPattern: (pattern: EKSDeployKind) => void;
  changeCurAccount: (id: string) => void;
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
    (state: AppStateProps) => state.amplifyConfig
  );

  const [curEks, setCurEks] = useState<SelectItem | null>({
    name: eksClusterLogSource.eksClusterName,
    value: eksClusterLogSource.eksClusterName,
  });
  const [loadingEksList, setLoadingEksList] = useState(false);
  const [eksOptionList, setEksOptionList] = useState<SelectItem[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);

  const getEksClusterList = async () => {
    try {
      setLoadingEksList(true);
      const clusterNames: string[] = await getAllEksClusterNamesList("", []);
      const optionList: SelectItem[] = clusterNames.map((name: string) => {
        return { name: name, value: name };
      });
      setEksOptionList(optionList);
      setLoadingEksList(false);
    } catch (error) {
      console.error(error);
    }
  };

  // recursively get all clusterNames.
  const getAllEksClusterNamesList = async (
    pageToken: string,
    clusterNames: string[]
  ): Promise<string[]> => {
    const resData: any = await appSyncRequestQuery(listEKSClusterNames, {
      nextToken: pageToken,
      accountId: eksClusterLogSource.accountId,
      isListAll: false, // isListAll目前传False，True代表非AWS EKS
    });
    const nextPage = resData.data.listEKSClusterNames.nextToken;
    (resData.data.listEKSClusterNames.clusters || []).forEach(
      (cluster: string) => {
        clusterNames.push(cluster);
      }
    );
    if (!nextPage || nextPage.length <= 0) {
      return clusterNames;
    }
    return getAllEksClusterNamesList(nextPage, clusterNames);
  };

  useEffect(() => {
    setCurEks(null);
    getEksClusterList();
  }, [eksClusterLogSource.accountId]);

  return (
    <div>
      <HeaderPanel title={t("ekslog:create.eksSource.eks")}>
        <div>
          <CrossAccountSelect
            accountId={eksClusterLogSource.accountId}
            changeAccount={(id) => {
              changeCurAccount(id);
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
            <AutoComplete
              disabled={loadingEksList || loadingAccount}
              outerLoading
              className="m-w-75p"
              placeholder={t("ekslog:select")}
              value={curEks}
              loading={loadingEksList}
              optionList={eksOptionList}
              onChange={(event: any, data: SelectItem) => {
                setCurEks(data || EMPTY_EKS_SELECT_ITEM);
                changeEksClusterSource(data?.value || "");
              }}
            ></AutoComplete>
          </FormItem>
        </div>
      </HeaderPanel>
      <HeaderPanel title={t("ekslog:create.eksSource.agent")}>
        <div>
          <FormItem
            infoType={InfoBarTypes.EKS_PATTERN}
            optionTitle={t("ekslog:create.eksSource.eksAgentPattern")}
            optionDesc={t("ekslog:create.eksSource.eksAgentPatternDesc")}
          >
            <Select
              className="m-w-75p"
              optionList={EKS_LOG_AGENT_PATTERN_LIST}
              value={eksClusterLogSource.deploymentKind}
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
