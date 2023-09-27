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
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import ExtLink from "components/ExtLink";
import { appSyncRequestQuery } from "assets/js/request";
import { domainStatusCheck, listDomainNames } from "graphql/queries";
import Select, { SelectItem } from "components/Select/select";
import { ImportedDomainType } from "../ImportCluster";
import { DOCS_LINK_CREATE_ES } from "assets/js/const";
import { useTranslation } from "react-i18next";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import { buildSubnetLink } from "assets/js/utils";
import ExpandableSection from "components/ExpandableSection";
import StatusIndicator from "components/StatusIndicator";
import {
  DomainNameAndStatus,
  DomainStatusCheckDetail,
  DomainStatusCheckType,
} from "API";
import { AmplifyConfigType } from "types";
import { useSelector } from "react-redux";
import { RootState } from "reducer/reducers";

interface SelectDomainProps {
  importedCluster: ImportedDomainType;
  changeDomain: (domain: string) => void;
  disableSelect?: boolean;
  emptyError?: boolean;
  clearEmptyError?: () => void;
  changeDomainStatus: (domainStatus: string) => void;
}

enum HeaderPanelStatus {
  Loading = "loading",
  Success = "success",
  Error = "error",
  Normal = "normal",
  Pending = "pending",
}

const SelectDomain: React.FC<SelectDomainProps> = (
  props: SelectDomainProps
) => {
  const {
    importedCluster,
    changeDomain,
    emptyError,
    clearEmptyError,
    disableSelect,
    changeDomainStatus,
  } = props;
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const [domain, setDomain] = useState(importedCluster.domainName);
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [domainOptionList, setDomainOptionList] = useState<any[]>([]);
  const [alertType, setAlertType] = useState(AlertType.InProgress);
  const [engineVersionStatus, setEngineVersionStatus] =
    useState<HeaderPanelStatus>(HeaderPanelStatus.Loading);
  const [engineVersionDetail, setEngineVersionDetail] = useState<string>("");
  const [engineTypeStatus, setEngineTypeStatus] = useState<HeaderPanelStatus>(
    HeaderPanelStatus.Loading
  );
  const [engineTypeDetail, setEngineTypeDetail] = useState<string>("");
  const [networkTypeStatus, setNetworkTypeStatus] = useState<HeaderPanelStatus>(
    HeaderPanelStatus.Loading
  );
  const [networkTypeDetail, setNetworkTypeDetail] = useState<string>("");
  const [
    solutionPrivateSubnetWithNatStatus,
    setSolutionPrivateSubnetWithNatStatus,
  ] = useState<HeaderPanelStatus>(HeaderPanelStatus.Loading);
  const [
    solutionPrivateSubnetWithNatDetail,
    setSolutionPrivateSubnetWithNatDetail,
  ] = useState<string[]>([]);

  const getESDomainList = async () => {
    try {
      setLoadingDomain(true);
      const resData: any = await appSyncRequestQuery(listDomainNames);
      const dataDomainList: DomainNameAndStatus[] =
        resData.data?.listDomainNames?.domainNames;
      setLoadingDomain(false);
      const tmpDomainOptionList: SelectItem[] = [];
      dataDomainList.forEach((element) => {
        tmpDomainOptionList.push({
          name: element.domainName ?? "",
          value: element.domainName ?? "",
          optTitle: element.status ?? "",
          disabled: (element.status ?? "") === "ACTIVE" ? false : true,
        });
      });
      setDomainOptionList(tmpDomainOptionList);
    } catch (error) {
      console.error(error);
    }
  };

  const resetCheckStatus = () => {
    setAlertType(AlertType.InProgress);
    setEngineVersionStatus(HeaderPanelStatus.Loading);
    setEngineVersionDetail("");
    setEngineTypeStatus(HeaderPanelStatus.Loading);
    setEngineTypeDetail("");
    setNetworkTypeStatus(HeaderPanelStatus.Loading);
    setNetworkTypeDetail("");
    setSolutionPrivateSubnetWithNatStatus(HeaderPanelStatus.Loading);
    setSolutionPrivateSubnetWithNatDetail([]);
  };

  const getTmpStatus = (status: DomainStatusCheckType | null | undefined) => {
    return status === DomainStatusCheckType.PASSED
      ? HeaderPanelStatus.Success
      : HeaderPanelStatus.Error;
  };

  const updateCheckingDetails = (
    domainStatusDetails: DomainStatusCheckDetail[]
  ) => {
    // Update the checking details
    const domainVersionDetailItem = domainStatusDetails.find(
      (detail) => detail.name === "OpenSearchDomainVersion"
    );
    if (domainVersionDetailItem) {
      const { status, values } = domainVersionDetailItem;
      const tmp_status = getTmpStatus(status);
      setEngineVersionStatus(tmp_status);
      setEngineVersionDetail((values ?? []).join(", "));
    }

    const domainEngineDetailItem = domainStatusDetails.find(
      (detail) => detail.name === "OpenSearchDomainEngine"
    );
    if (domainEngineDetailItem) {
      const { status, values } = domainEngineDetailItem;
      const tmp_status = getTmpStatus(status);
      setEngineTypeStatus(tmp_status);
      setEngineTypeDetail((values ?? []).join(", "));
    }
    const domainNetworkTypeItem = domainStatusDetails.find(
      (detail) => detail.name === "OpenSearchDomainNetworkType"
    );

    if (domainNetworkTypeItem) {
      const { status, values } = domainNetworkTypeItem;
      const tmp_status = getTmpStatus(status);
      setNetworkTypeStatus(tmp_status);
      setNetworkTypeDetail(
        (
          values?.map((str) => t(`cluster:import.selectDomain.${str}`)) ?? []
        ).join(", ")
      );
    }

    const solutionPrivateSubnetWithNatDetailItem = domainStatusDetails.find(
      (detail) => detail.name === "SolutionPrivateSubnetWithNAT"
    );
    if (solutionPrivateSubnetWithNatDetailItem) {
      const { status, values } = solutionPrivateSubnetWithNatDetailItem;
      const tmp_status = getTmpStatus(status);
      setSolutionPrivateSubnetWithNatStatus(tmp_status);
      setSolutionPrivateSubnetWithNatDetail(
        (values ?? []).filter(Boolean).map(String)
      );
    }
  };

  const checkAndUpdateDomainStatus = async (domainName: string) => {
    try {
      resetCheckStatus();
      const resData: any = await appSyncRequestQuery(domainStatusCheck, {
        domainName: domainName,
      });
      const domainStatus: DomainStatusCheckType =
        resData.data?.domainStatusCheck?.status;
      changeDomainStatus(domainStatus || DomainStatusCheckType.CHECKING);
      const domainStatusDetails: DomainStatusCheckDetail[] =
        resData.data?.domainStatusCheck?.details;
      setAlertType(
        domainStatus === DomainStatusCheckType.PASSED
          ? AlertType.Pass
          : AlertType.Error
      );
      updateCheckingDetails(domainStatusDetails);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getESDomainList();
  }, []);

  useEffect(() => {
    if (domain) {
      checkAndUpdateDomainStatus(domain);
    }
  }, [domain]);

  return (
    <div>
      <HeaderPanel title={t("cluster:import.selectDomain.osDomain")}>
        <div>
          <FormItem
            optionTitle={t("cluster:import.selectDomain.domain")}
            optionDesc={
              <div>
                {t("cluster:import.selectDomain.domainDesc1")}
                <ExtLink to={DOCS_LINK_CREATE_ES}>
                  {t("cluster:import.selectDomain.domainDesc2")}
                </ExtLink>
                {t("cluster:import.selectDomain.domainDesc3")}
              </div>
            }
            errorText={
              emptyError ? t("cluster:import.selectDomain.domainError") : ""
            }
          >
            <Select
              hasStatus
              disabled={disableSelect}
              className="m-w-75p"
              placeholder={t("cluster:import.selectDomain.selectDomain")}
              loading={loadingDomain}
              optionList={domainOptionList}
              value={domain}
              onChange={(event) => {
                console.info(event);
                changeDomainStatus(DomainStatusCheckType.CHECKING);
                clearEmptyError && clearEmptyError();
                setDomain(event.target.value);
                changeDomain(event.target.value);
              }}
              hasRefresh
              clickRefresh={() => {
                getESDomainList();
              }}
            />
          </FormItem>

          {domain && (
            <>
              <FormItem optionTitle="" optionDesc="">
                <Alert
                  type={alertType}
                  title={t("cluster:import.selectDomain.checkDomain")}
                  content={t(
                    `cluster:import.selectDomain.checkDomain${alertType}Desc`
                  )}
                />
              </FormItem>

              <ExpandableSection headerText="Details">
                <div>
                  <div className="mb-10">
                    <StatusIndicator type={engineVersionStatus}>
                      {`${t(
                        "cluster:import.selectDomain.engineVersion"
                      )} ${engineVersionDetail}`}
                    </StatusIndicator>
                  </div>
                  <div className="mb-10">
                    <StatusIndicator type={engineTypeStatus}>
                      {`${t(
                        "cluster:import.selectDomain.engineType"
                      )} ${engineTypeDetail}`}
                    </StatusIndicator>
                  </div>
                  <div className="mb-10">
                    <StatusIndicator type={networkTypeStatus}>
                      {`${t(
                        "cluster:import.selectDomain.networkType"
                      )} ${networkTypeDetail}`}
                    </StatusIndicator>
                  </div>
                  <div className="mb-10">
                    <StatusIndicator type={solutionPrivateSubnetWithNatStatus}>
                      <div style={{ display: "inline-block" }}>
                        {t(
                          "cluster:import.selectDomain.solutionPrivateSubnetWithNat"
                        )}
                        {solutionPrivateSubnetWithNatDetail?.map((element) => {
                          return (
                            <div
                              key={element}
                              style={{ display: "inline-block" }}
                            >
                              <ExtLink
                                to={buildSubnetLink(
                                  amplifyConfig.aws_project_region,
                                  element
                                )}
                              >
                                {`${element}`}
                              </ExtLink>
                            </div>
                          );
                        })}
                      </div>
                    </StatusIndicator>
                  </div>
                </div>
              </ExpandableSection>
            </>
          )}

          {importedCluster.domainStatus &&
            importedCluster.domainStatus !== DomainStatusCheckType.CHECKING &&
            importedCluster.domainStatus === DomainStatusCheckType.FAILED && (
              <div className="mt-20">
                <Alert
                  content={`${
                    engineVersionStatus === "error"
                      ? `${t(
                          "cluster:import.selectDomain.alertDomainVersion"
                        )}\n`
                      : ""
                  }${
                    engineTypeStatus === "error"
                      ? `${t(
                          "cluster:import.selectDomain.alertDomainEngineType"
                        )}\n`
                      : ""
                  }${
                    networkTypeStatus === "error"
                      ? `${t("cluster:import.selectDomain.alertDomainInVpc")}\n`
                      : ""
                  }${
                    solutionPrivateSubnetWithNatStatus === "error"
                      ? `${t(
                          "cluster:import.selectDomain.alertSolutionPrivateNAT"
                        )}\n`
                      : ""
                  }`}
                ></Alert>
              </div>
            )}
        </div>
      </HeaderPanel>
    </div>
  );
};

export default SelectDomain;
