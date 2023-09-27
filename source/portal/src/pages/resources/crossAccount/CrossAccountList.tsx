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
import Breadcrumb from "components/Breadcrumb";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import { SelectType, TablePanel } from "components/TablePanel";
import Button from "components/Button";
import { SubAccountLink } from "API";
import { Link, useNavigate } from "react-router-dom";
import { Pagination } from "@material-ui/lab";
import HelpPanel from "components/HelpPanel";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { listSubAccountLinks } from "graphql/queries";
import { deleteSubAccountLink } from "graphql/mutations";
import Modal from "components/Modal";
import { formatLocalTime } from "assets/js/utils";
import { handleErrorMessage } from "assets/js/alert";
import ButtonRefresh from "components/ButtonRefresh";

const PAGE_SIZE = 10;

const CrossAccountList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    { name: t("resource:crossAccount.name") },
  ];

  const [loadingData, setLoadingData] = useState(false);
  const [disabledDelete, setDisabledDelete] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [totoalCount, setTotoalCount] = useState(0);
  const [curPage, setCurPage] = useState(1);
  const [crossAccountList, setCrossAccountList] = useState<SubAccountLink[]>(
    []
  );
  const [curAccount, setCurAccount] = useState<SubAccountLink>();
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SubAccountLink[]>();

  // Get Member Account List
  const getCrossAccountList = async () => {
    try {
      setCrossAccountList([]);
      setSelectedAccount([]);
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(listSubAccountLinks, {
        page: curPage,
        count: PAGE_SIZE,
      });
      console.info("resData:", resData);
      const dataLogAccountList: SubAccountLink[] =
        resData.data.listSubAccountLinks.subAccountLinks;
      setTotoalCount(resData.data.listSubAccountLinks?.total || 0);
      setCrossAccountList(dataLogAccountList);
      setLoadingData(false);
    } catch (error) {
      console.error(error);
    }
  };

  const removeCrossAccount = async () => {
    setCurAccount(selectedAccount?.[0]);
    setOpenDeleteModel(true);
  };

  const confirmRemoveCrossAccount = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteSubAccountLink, {
        subAccountId: curAccount?.subAccountId,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModel(false);
      getCrossAccountList();
    } catch (error: any) {
      setLoadingDelete(false);
      handleErrorMessage(error.message);
      console.error(error);
    }
  };

  const handlePageChange = (event: any, value: number) => {
    setCurPage(value);
  };

  // Disable delete button when no row selected.
  useEffect(() => {
    if (selectedAccount && selectedAccount.length > 0) {
      setDisabledDelete(false);
    } else {
      setDisabledDelete(true);
    }
  }, [selectedAccount]);

  useEffect(() => {
    getCrossAccountList();
  }, []);

  const renderAccountId = (data: SubAccountLink) => {
    return (
      <Link to={`/resources/cross-account/detail/${data.subAccountId}`}>
        {data.subAccountName}
      </Link>
    );
  };

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
            <div className="table-data">
              <TablePanel
                trackId="subAccountId"
                title={t("resource:crossAccount.list.accounts")}
                changeSelected={(item) => {
                  setSelectedAccount(item);
                }}
                loading={loadingData}
                selectType={SelectType.RADIO}
                columnDefinitions={[
                  {
                    // width: 110,
                    id: "ID",
                    header: t("resource:crossAccount.list.accountName"),
                    cell: (e: SubAccountLink) => renderAccountId(e),
                  },
                  {
                    id: "Name",
                    header: t("resource:crossAccount.list.accountId"),
                    cell: (e: SubAccountLink) => {
                      return e.subAccountId;
                    },
                  },
                  {
                    id: "Role",
                    header: t("resource:crossAccount.list.iamRole"),
                    cell: (e: SubAccountLink) => {
                      return e.subAccountRoleArn;
                    },
                  },
                  {
                    width: 170,
                    id: "created",
                    header: t("resource:crossAccount.list.created"),
                    cell: (e: SubAccountLink) => {
                      return formatLocalTime(e?.createdAt || "");
                    },
                  },
                ]}
                items={crossAccountList}
                actions={
                  <div>
                    <Button
                      btnType="icon"
                      disabled={loadingData}
                      onClick={() => {
                        if (curPage === 1) {
                          getCrossAccountList();
                        } else {
                          setCurPage(1);
                        }
                      }}
                    >
                      <ButtonRefresh loading={loadingData} fontSize="small" />
                    </Button>

                    <Button
                      disabled={disabledDelete}
                      onClick={() => {
                        removeCrossAccount();
                      }}
                    >
                      {t("button.remove")}
                    </Button>

                    <Button
                      btnType="primary"
                      onClick={() => {
                        navigate("/resources/cross-account/link");
                      }}
                    >
                      {t("button.linkAnAccount")}
                    </Button>
                  </div>
                }
                pagination={
                  <Pagination
                    count={Math.ceil(totoalCount / PAGE_SIZE)}
                    page={curPage}
                    onChange={handlePageChange}
                    size="small"
                  />
                }
              />
            </div>
          </div>
          <Modal
            title={t("resource:crossAccount.list.removeLink")}
            fullWidth={false}
            isOpen={openDeleteModel}
            closeModal={() => {
              setOpenDeleteModel(false);
            }}
            actions={
              <div className="button-action no-pb text-right">
                <Button
                  btnType="text"
                  disabled={loadingDelete}
                  onClick={() => {
                    setOpenDeleteModel(false);
                  }}
                >
                  {t("button.cancel")}
                </Button>
                <Button
                  loading={loadingDelete}
                  btnType="primary"
                  onClick={() => {
                    confirmRemoveCrossAccount();
                  }}
                >
                  {t("button.remove")}
                </Button>
              </div>
            }
          >
            <div className="modal-content">
              {t("resource:crossAccount.list.removeLinkTips")}
              <b>{`${curAccount?.subAccountName}`}</b> {"?"}
            </div>
          </Modal>
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default CrossAccountList;
