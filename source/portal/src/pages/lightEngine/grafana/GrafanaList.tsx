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

import { Pagination } from "@material-ui/lab";
import Breadcrumb from "components/Breadcrumb";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import Button from "components/Button";
import { SelectType, TablePanel } from "components/TablePanel";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAsyncData } from "assets/js/useAsyncData";
import {
  ApiResponse,
  appSyncRequestMutation,
  appSyncRequestQuery,
} from "assets/js/request";
import { listGrafanas } from "graphql/queries";
import { Grafana, ListGrafanasResponse } from "API";
import moment from "moment";
import Modal from "components/Modal";
import { deleteGrafana } from "graphql/mutations";

const PAGE_SIZE = 10;

export const GrafanaList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGrafana, setSelectedGrafana] = useState<Grafana | null>(null);
  const [removeModelOpened, setRemoveModelOpened] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, isLoadingData, reloadData } = useAsyncData<
    ApiResponse<"listGrafanas", ListGrafanasResponse>
  >(
    () =>
      appSyncRequestQuery(listGrafanas, {
        page: currentPage,
        count: PAGE_SIZE,
      }),
    [currentPage]
  );
  const grafanaListItem = data?.data.listGrafanas.grafanas ?? [];
  const totalItems = data?.data.listGrafanas.total ?? 0;
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: t("lightengine:grafana.name"),
    },
  ];
  const sideMenu = useMemo(() => <SideMenu />, []);
  const breadcrumb = useMemo(() => <Breadcrumb list={breadCrumbList} />, []);

  const confirmRemoveGrafana = useCallback(async () => {
    try {
      if (!selectedGrafana) {
        throw new Error("No grafana selected");
      }
      setIsDeleting(true);
      const removeRes = await appSyncRequestMutation(deleteGrafana, {
        id: selectedGrafana.id,
      });
      console.info("removeRes:", removeRes);
      setIsDeleting(false);
      setSelectedGrafana(null);
      setRemoveModelOpened(false);
      reloadData();
    } catch (error) {
      setIsDeleting(false);
      console.error(error);
    }
  }, [selectedGrafana]);

  return (
    <div className="lh-main-content">
      {sideMenu}
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            {breadcrumb}
            <div className="table-data">
              <TablePanel
                trackId="id"
                loading={isLoadingData}
                title={t("lightengine:grafana.create.server")}
                selectType={SelectType.RADIO}
                actions={
                  <div>
                    <Button
                      disabled={selectedGrafana === null}
                      onClick={() => {
                        if (selectedGrafana) {
                          const { id, url, name } = selectedGrafana;
                          navigate(
                            `/grafana/edit/${id}?url=${encodeURIComponent(
                              url
                            )}&name=${encodeURIComponent(name)}`
                          );
                        }
                      }}
                    >
                      {t("button.edit")}
                    </Button>
                    <Button
                      disabled={selectedGrafana === null}
                      onClick={() => setRemoveModelOpened(true)}
                    >
                      {t("button.remove")}
                    </Button>
                    <Button
                      btnType="primary"
                      onClick={() => {
                        navigate("/grafana/import");
                      }}
                    >
                      {t("lightengine:grafana.import")}
                    </Button>
                  </div>
                }
                pagination={
                  <Pagination
                    count={Math.ceil(totalItems / PAGE_SIZE)}
                    page={currentPage}
                    onChange={(_, value) => {
                      setCurrentPage(value);
                      setSelectedGrafana(null);
                    }}
                    size="small"
                  />
                }
                items={isLoadingData ? [] : grafanaListItem ?? []}
                changeSelected={([grafana]: Grafana[]) =>
                  setSelectedGrafana(grafana)
                }
                columnDefinitions={[
                  {
                    id: "name",
                    header: t("lightengine:grafana.serverName"),
                    cell: ({ name }: Grafana) => name,
                  },
                  {
                    id: "createdDate",
                    header: t("lightengine:grafana.dateImported"),
                    cell: ({ createdAt }: Grafana) =>
                      moment(createdAt).format("YYYY-MM-DD"),
                  },
                  {
                    id: "url",
                    header: t("lightengine:grafana.url"),
                    cell: ({ url }: Grafana) => (
                      <a target="_blank" rel="noreferrer" href={url}>
                        {url}
                      </a>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
      <Modal
        title={t("lightengine:grafana.delete")}
        fullWidth={false}
        isOpen={removeModelOpened}
        closeModal={() => {
          setRemoveModelOpened(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              btnType="text"
              disabled={isDeleting}
              onClick={() => {
                setRemoveModelOpened(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              loading={isDeleting}
              btnType="primary"
              onClick={confirmRemoveGrafana}
            >
              {t("button.delete")}
            </Button>
          </div>
        }
      >
        <div className="modal-content">
          {t("lightengine:grafana.deleteTips")}
          <b>{`${selectedGrafana?.name}`}</b> {"?"}
        </div>
      </Modal>
      <HelpPanel />
    </div>
  );
};
