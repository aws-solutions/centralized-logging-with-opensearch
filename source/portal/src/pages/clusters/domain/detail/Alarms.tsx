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
import React, { useState } from "react";
import HeaderPanel from "components/HeaderPanel";
import { AlarmType, DomainDetails, StackStatus } from "API";
import { domainAlramList } from "assets/js/const";
import Button from "components/Button";
import Modal from "components/Modal";
import { appSyncRequestMutation } from "assets/js/request";
import { deleteAlarmForOpenSearch } from "graphql/mutations";
import { useTranslation } from "react-i18next";

interface TagProps {
  domainInfo: DomainDetails | undefined | null;
  reloadDetailInfo: () => void;
}

const Alarms: React.FC<TagProps> = (props: TagProps) => {
  const { domainInfo, reloadDetailInfo } = props;
  const { t } = useTranslation();
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const confirmRemoveAlarm = async () => {
    try {
      setLoadingDelete(true);
      const removeRes = await appSyncRequestMutation(deleteAlarmForOpenSearch, {
        id: domainInfo?.id,
      });
      console.info("removeRes:", removeRes);
      setLoadingDelete(false);
      setOpenDeleteModal(false);
      reloadDetailInfo();
    } catch (error) {
      setLoadingDelete(false);
      console.error(error);
    }
  };

  const buildAlarmValue = (value?: any, type?: AlarmType | null) => {
    if (Number.isInteger(parseInt(value || ""))) {
      if (type === AlarmType.FREE_STORAGE_SPACE) {
        return parseFloat(value || "") / 1024;
      } else {
        return value;
      }
    } else {
      return "N/A";
    }
  };

  return (
    <div>
      <HeaderPanel
        action={
          <div>
            {domainInfo?.alarmInput?.alarms &&
              (domainInfo.alarmStatus === StackStatus.ENABLED ||
                domainInfo.alarmStatus === StackStatus.ERROR) && (
                <Button
                  onClick={() => {
                    setOpenDeleteModal(true);
                  }}
                >
                  {t("button.delete")}
                </Button>
              )}
          </div>
        }
        title={t("cluster:detail.alarms.name")}
        contentNoPadding
      >
        {domainInfo?.alarmInput?.alarms ? (
          <div>
            <div className="flex show-tag-list">
              <div className="tag-key w-alarm">
                <b>{t("cluster:detail.alarms.alarm")}</b>
              </div>
              <div className="tag-value flex-1">
                <b>{t("cluster:detail.alarms.value")}</b>
              </div>
            </div>
            {domainInfo?.alarmInput?.alarms?.map((alarm) => {
              return (
                <div key={`${alarm?.type}`} className="flex show-tag-list">
                  <div className="tag-key w-alarm">
                    {t(
                      domainAlramList.find((item) => item.key === alarm?.type)
                        ?.name || ""
                    )}
                  </div>
                  <div className="tag-value flex-1">
                    {buildAlarmValue(alarm?.value, alarm?.type)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pd-20">N/A</div>
        )}
      </HeaderPanel>

      <Modal
        title={t("cluster:detail.alarms.remove")}
        fullWidth={false}
        isOpen={openDeleteModal}
        closeModal={() => {
          setOpenDeleteModal(false);
        }}
        actions={
          <div className="button-action no-pb text-right">
            <Button
              disabled={loadingDelete}
              btnType="text"
              onClick={() => {
                setOpenDeleteModal(false);
              }}
            >
              {t("button.cancel")}
            </Button>
            <Button
              loading={loadingDelete}
              btnType="primary"
              onClick={() => {
                confirmRemoveAlarm();
              }}
            >
              {t("button.delete")}
            </Button>
          </div>
        }
      >
        <div className="modal-content">
          {t("cluster:detail.alarms.removeTips")}
          {"? "}
        </div>
      </Modal>
    </div>
  );
};

export default Alarms;
