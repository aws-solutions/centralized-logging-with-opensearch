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
import Button from "components/Button";
import { SelectType, TablePanel } from "components/TablePanel";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { useAsyncData } from "assets/js/useAsyncData";
import {
  ApiResponse,
  appSyncRequestMutation,
  appSyncRequestQuery,
} from "assets/js/request";
import { listGrafanas } from "graphql/queries";
import { Grafana, ListGrafanasResponse } from "API";
import Modal from "components/Modal";
import { deleteGrafana } from "graphql/mutations";
import CommonLayout from "pages/layout/CommonLayout";
import { formatLocalTime } from "assets/js/utils";
import ButtonRefresh from "components/ButtonRefresh";

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

  const renderLink = (url: string) => {
    return (
      <a target="_blank" rel="noreferrer" href={url}>
        {url}
      </a>
    );
  };

  const renderName = (id: string, name: string) => {
    return <Link to={`/grafana/edit/${id}`}>{name}</Link>;
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="table-data">
        <TablePanel
          trackId="id"
          loading={isLoadingData}
          title={t("lightengine:grafana.create.server")}
          selectType={SelectType.RADIO}
          actions={
            <div>
              <Button
                data-testid="refresh-button"
                btnType="icon"
                disabled={isLoadingData}
                onClick={() => {
                  if (currentPage === 1) {
                    reloadData();
                  } else {
                    setCurrentPage(1);
                  }
                }}
              >
                <ButtonRefresh loading={isLoadingData} fontSize="small" />
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
          changeSelected={([grafana]: Grafana[]) => setSelectedGrafana(grafana)}
          columnDefinitions={[
            {
              id: "name",
              header: t("lightengine:grafana.serverName"),
              cell: ({ id, name }: Grafana) => renderName(id, name),
            },
            {
              id: "url",
              header: t("lightengine:grafana.url"),
              cell: ({ url }: Grafana) => renderLink(url),
            },
            {
              id: "createdDate",
              header: t("lightengine:grafana.dateImported"),
              cell: ({ createdAt }: Grafana) =>
                formatLocalTime(createdAt ?? ""),
            },
          ]}
        />
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
    </CommonLayout>
  );
};
