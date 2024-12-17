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
import { EKSDeployKind, LogSourceType, LogSource } from "API";
import { appSyncRequestQuery } from "assets/js/request";
import {
  buildEKSLink,
  buildRoleLink,
  defaultStr,
  formatLocalTime,
} from "assets/js/utils";
import ExtLink from "components/ExtLink";
import Modal from "components/Modal";
import Button from "components/Button";
import Alert from "components/Alert";
import { AlertType } from "components/Alert/alert";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AntTab, AntTabs, TabPanel } from "components/Tab";
import { getLogSource } from "graphql/queries";
import AccountName from "pages/comps/account/AccountName";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AmplifyConfigType } from "types";
import DaemonsetGuide from "./detail/DaemonsetGuide";
import EksIngestions from "./detail/Ingestions";
import { RootState } from "reducer/reducers";
import CommonLayout from "pages/layout/CommonLayout";
import HeaderWithValueLabel from "pages/comps/HeaderWithValueLabel";
import { InfoBarTypes } from "reducer/appReducer";

const EksLogDetail: React.FC = () => {
  const { id, type } = useParams();
  const { t } = useTranslation();
  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const [loadingData, setLoadingData] = useState(true);
  const [curEksLogSource, setCurEksLogSource] = useState<
    LogSource | undefined
  >();
  const [activeTab, setActiveTab] = useState(
    type === "guide" ? "guide" : "logSource"
  );
  const [showDaemonsetGuide, setShowDaemonsetGuide] = useState(false);
  const [showEKSDaemonSetModal, setShowEKSDaemonSetModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("ekslog:name"),
      link: "/containers/eks-log",
    },
    {
      name: defaultStr(curEksLogSource?.eks?.eksClusterName),
    },
  ];

  const getEksLogSourceById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getLogSource, {
        type: LogSourceType.EKSCluster,
        sourceId: encodeURIComponent(defaultStr(id)),
      });
      console.info("resData", resData);
      const configData = resData.data.getLogSource;
      setCurEksLogSource(configData);
      setLoadingData(false);
      setShowDaemonsetGuide(() => {
        return configData.eks?.deploymentKind === EKSDeployKind.DaemonSet;
      });
    } catch (error) {
      setCurEksLogSource(undefined);
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    const state = location.state as {
      showEKSDaemonSetModal?: boolean;
      eksSourceId?: string;
    };
    setShowEKSDaemonSetModal(state?.showEKSDaemonSetModal ?? false);
    getEksLogSourceById();
  }, []);

  return (
    <CommonLayout breadCrumbList={breadCrumbList} loadingData={loadingData}>
      <div>
        <HeaderWithValueLabel
          numberOfColumns={4}
          dataList={[
            {
              label: t("ekslog:detail.name"),
              data: (
                <div>
                  {curEksLogSource?.accountId ? (
                    <ExtLink
                      to={buildEKSLink(
                        amplifyConfig.aws_project_region,
                        curEksLogSource.eks?.eksClusterName
                      )}
                    >
                      {curEksLogSource?.eks?.eksClusterName}
                    </ExtLink>
                  ) : (
                    curEksLogSource?.eks?.eksClusterName
                  )}
                </div>
              ),
            },
            {
              label: t("ekslog:detail.deploymentPattern"),
              data: <div>{curEksLogSource?.eks?.deploymentKind}</div>,
            },
            {
              label: t("resource:crossAccount.account"),
              data: (
                <AccountName
                  accountId={defaultStr(curEksLogSource?.accountId)}
                  region={amplifyConfig.aws_project_region}
                />
              ),
            },
            {
              label: t("ekslog:detail.created"),
              data: (
                <div>
                  {formatLocalTime(defaultStr(curEksLogSource?.createdAt))}
                </div>
              ),
            },
            {
              label: t("ekslog:detail.iamRole"),
              infoType: InfoBarTypes.EKS_IAM_ROLE,
              data: (
                <ExtLink
                  to={buildRoleLink(
                    curEksLogSource?.eks?.logAgentRoleArn
                      ? curEksLogSource.eks?.logAgentRoleArn.split("/")[1]
                      : "",
                    amplifyConfig.aws_project_region
                  )}
                >
                  {curEksLogSource?.eks?.logAgentRoleArn}
                </ExtLink>
              ),
            },
          ]}
        />
      </div>
      <>
        {curEksLogSource && showDaemonsetGuide ? (
          <div>
            <AntTabs
              value={activeTab}
              onChange={(event, newTab) => {
                setActiveTab(newTab);
              }}
            >
              <AntTab
                label={t("ekslog:detail.tab.applications")}
                value="logSource"
              />

              <AntTab
                label={t("ekslog:detail.tab.daemonsetGuide")}
                value="guide"
              />
            </AntTabs>
            <TabPanel value={activeTab} index="logSource">
              <EksIngestions eksLogSourceInfo={curEksLogSource} />
            </TabPanel>
            <TabPanel value={activeTab} index={"guide"}>
              <DaemonsetGuide eksLogSourceInfo={curEksLogSource} />
            </TabPanel>
          </div>
        ) : (
          <>
            {curEksLogSource && (
              <EksIngestions eksLogSourceInfo={curEksLogSource} />
            )}
          </>
        )}

        {curEksLogSource?.eks?.deploymentKind === EKSDeployKind.DaemonSet && (
          <Modal
            title={t("applog:detail.ingestion.oneMoreStepEKS")}
            fullWidth={false}
            isOpen={showEKSDaemonSetModal}
            closeModal={() => {
              setShowEKSDaemonSetModal(false);
            }}
            actions={
              <div className="button-action no-pb text-right">
                <Button
                  btnType="text"
                  onClick={() => {
                    setShowEKSDaemonSetModal(false);
                  }}
                >
                  {t("button.cancel")}
                </Button>
                <Button
                  btnType="primary"
                  onClick={() => {
                    setShowEKSDaemonSetModal(false);
                    const newHistoryState = {
                      showEKSDaemonSetModal: false,
                      eksSourceId: "",
                    };
                    navigate(`/containers/eks-log/detail/${id}`, {
                      state: newHistoryState,
                    });
                  }}
                >
                  {t("button.confirm")}
                </Button>
              </div>
            }
          >
            <div className="modal-content alert-content">
              <Alert
                noMargin
                type={AlertType.Warning}
                content={
                  <div>
                    <p>
                      <strong>
                        {t("applog:detail.ingestion.eksDeamonSetTips_0")}
                      </strong>
                    </p>
                    {t("applog:detail.ingestion.eksDeamonSetTips_1")}
                    <a
                      href={`/containers/eks-log/detail/${curEksLogSource?.sourceId}/guide`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("applog:detail.ingestion.eksDeamonSetLink")}
                    </a>
                    {t("applog:detail.ingestion.eksDeamonSetTips_2")}
                  </div>
                }
              />
            </div>
          </Modal>
        )}
      </>
    </CommonLayout>
  );
};

export default EksLogDetail;
