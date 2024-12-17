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
import Button from "components/Button";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlarmInput,
  AlarmType,
  CreateAlarmForOpenSearchMutationVariables,
} from "API";
import { appSyncRequestMutation } from "assets/js/request";
import TextInput from "components/TextInput";
import {
  AlarmParamType,
  domainAlramList as domainAlarmList,
} from "assets/js/const";
import { createAlarmForOpenSearch } from "graphql/mutations";
import { useTranslation } from "react-i18next";
import { defaultStr, emailIsValid } from "assets/js/utils";
import { Alert } from "assets/js/alert";
import classNames from "classnames";
import CommonLayout from "pages/layout/CommonLayout";

interface DomainAlarmProps {
  id: string;
  input: {
    email: string;
    phone: string;
    phonePostNum: string;
    phoneNum: string;
    alarmParams: AlarmParamType[];
  };
}

const DomainAlarm: React.FC = () => {
  const { id, name } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: name,
      link: `/clusters/opensearch-domains/detail/${id}`,
    },
    { name: t("cluster:alarm.name") },
  ];

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [showRequireEmailError, setShowRequireEmailError] = useState(false);
  const [emailFormatError, setEmailFormatError] = useState(false);
  const [minFreeStorageError, setMinFreeStorageError] = useState(false);
  const [nodeMinError, setNodeMinError] = useState(false);
  const [writeBlockError, setWriteBlockError] = useState(false);
  const [alarmData, setAlarmData] = useState<DomainAlarmProps>({
    id: decodeURIComponent(id ?? ""),
    input: {
      email: "",
      phone: "",
      phonePostNum: "",
      phoneNum: "",
      alarmParams: domainAlarmList,
    },
  });

  const backToDetailPage = () => {
    navigate(`/clusters/opensearch-domains/detail/${id}`);
  };

  const genValidateText = (alarmType: AlarmType) => {
    return `${
      domainAlarmList.find((element) => element.key === alarmType)?.name
    }${t("cluster:alarm.forbidNegative")}`;
  };

  const checkMinStorage = () => {
    // Check Min Storage Value
    if (
      alarmData.input.alarmParams.find(
        (element) => element.key === AlarmType.FREE_STORAGE_SPACE
      )?.isChecked &&
      minFreeStorageError
    ) {
      Alert(genValidateText(AlarmType.FREE_STORAGE_SPACE));
      return false;
    }
    return true;
  };

  const checkWriteBlockValue = () => {
    // Check Write Block Value
    if (
      alarmData.input.alarmParams.find(
        (element) => element.key === AlarmType.WRITE_BLOCKED
      )?.isChecked &&
      writeBlockError
    ) {
      Alert(genValidateText(AlarmType.WRITE_BLOCKED));
      return false;
    }
    return true;
  };

  const checkNodeMinValue = () => {
    // Check Node Min Value
    if (
      alarmData.input.alarmParams.find(
        (element) => element.key === AlarmType.NODE_UNREACHABLE
      )?.isChecked &&
      nodeMinError
    ) {
      Alert(genValidateText(AlarmType.NODE_UNREACHABLE));
      return false;
    }
    return true;
  };

  const buildAlarmList = (alarmDataParams: AlarmParamType[]) => {
    const alarmsList: AlarmInput[] = [];
    alarmDataParams.forEach((element) => {
      if (element.isChecked) {
        // if is min space, need to convert to MiB
        if (element.key === AlarmType.FREE_STORAGE_SPACE) {
          alarmsList.push({
            type: element.key,
            value: (parseFloat(element.value.toString()) * 1024).toString(),
          });
        } else {
          alarmsList.push({
            type: element.key,
            value: element.isNumber ? element.value.toString() : "true",
          });
        }
      }
    });
    return alarmsList;
  };

  const confirmCreateDomainAlarm = async () => {
    if (!alarmData.input.email) {
      setShowRequireEmailError(true);
      return;
    }
    if (!emailIsValid(alarmData.input.email)) {
      setEmailFormatError(true);
      return;
    }
    const alarmsList: AlarmInput[] = buildAlarmList(
      alarmData.input.alarmParams
    );

    if (!checkMinStorage()) {
      return;
    }

    if (!checkWriteBlockValue()) {
      return;
    }

    if (!checkNodeMinValue()) {
      return;
    }

    if (alarmsList.length <= 0) {
      Alert(t("cluster:alarm.selectAlarmTips"));
      return;
    }
    const alarmParamData: CreateAlarmForOpenSearchMutationVariables = {
      id: alarmData.id,
      input: {
        email: alarmData.input.email,
        phone: alarmData.input.phone,
        alarms: alarmsList,
      },
    };
    setLoadingCreate(true);
    const createRes = await appSyncRequestMutation(
      createAlarmForOpenSearch,
      alarmParamData
    );
    console.info("createRes:", createRes);
    setLoadingCreate(false);
    backToDetailPage();
  };

  useEffect(() => {
    // Check Min Free Storage Value
    const freeStorageValue =
      (alarmData.input.alarmParams.find(
        (element) => element.key === AlarmType.FREE_STORAGE_SPACE
      )?.value as string) || "0";
    if (parseFloat(freeStorageValue) < 0) {
      setMinFreeStorageError(true);
    } else {
      setMinFreeStorageError(false);
    }

    // Check Write Block Value
    const writeBlockValue =
      (alarmData.input.alarmParams.find(
        (element) => element.key === AlarmType.WRITE_BLOCKED
      )?.value as string) || "0";
    if (parseFloat(writeBlockValue) < 0) {
      setWriteBlockError(true);
    } else {
      setWriteBlockError(false);
    }

    // Check Node Min Value
    const nodeMinValue =
      (alarmData.input.alarmParams.find(
        (element) => element.key === AlarmType.NODE_UNREACHABLE
      )?.value as string) || "0";
    if (parseFloat(nodeMinValue) < 0) {
      setNodeMinError(true);
    } else {
      setNodeMinError(false);
    }
  }, [alarmData]);

  const updateAlarmData = (event: any, element: any) => {
    setAlarmData((prev) => {
      const prevObj: any = JSON.parse(JSON.stringify(prev));
      const paramIndex = prevObj.input.alarmParams.findIndex(
        (item: any) => item.key === element.key
      );
      prevObj.input.alarmParams[paramIndex].isChecked = event.target.checked;
      if (!element.isNumber) {
        prevObj.input.alarmParams[paramIndex].value = event.target.checked;
      }
      return prevObj;
    });
  };

  const updateAlarmDataValue = (event: any, element: any) => {
    setAlarmData((prev) => {
      const prevObj: any = JSON.parse(JSON.stringify(prev));
      const paramIndex = prevObj.input.alarmParams.findIndex(
        (item: any) => item.key === element.key
      );
      if (element.isNumber) {
        if (element.key === AlarmType.FREE_STORAGE_SPACE) {
          setMinFreeStorageError(false);
        }
        if (element.key === AlarmType.NODE_UNREACHABLE) {
          setNodeMinError(false);
        }
        prevObj.input.alarmParams[paramIndex].value = event.target.value;
      }
      return prevObj;
    });
  };

  return (
    <CommonLayout breadCrumbList={breadCrumbList}>
      <div className="m-w-1024">
        <HeaderPanel
          title={t("cluster:detail.alarms.name")}
          desc={t("cluster:detail.alarms.desc")}
        >
          <div>
            <div className="flex show-tag-list">
              <div className="checkbox">
                <input
                  data-testid="alarm-select-all"
                  type="checkbox"
                  onChange={(event) => {
                    if (event.target.checked) {
                      setAlarmData((prev) => {
                        const prevObj: any = JSON.parse(JSON.stringify(prev));
                        prevObj.input.alarmParams.forEach((element: any) => {
                          element.isChecked = true;
                        });
                        return prevObj;
                      });
                    } else {
                      setAlarmData((prev) => {
                        const prevObj: any = JSON.parse(JSON.stringify(prev));
                        prevObj.input.alarmParams.forEach((element: any) => {
                          element.isChecked = false;
                        });
                        return prevObj;
                      });
                    }
                  }}
                />
              </div>
              <div className="tag-key w-alarm">
                <b>{t("cluster:alarm.alarm")}</b>
              </div>
              <div className="tag-value flex-1">
                <b>{t("cluster:alarm.value")}</b>
              </div>
            </div>
            {alarmData.input.alarmParams.map((element) => {
              return (
                <div key={element.key} className="flex show-tag-list">
                  <div className="checkbox">
                    <input
                      data-testid={`alarm-checkbox-${element.key}`}
                      type="checkbox"
                      checked={element.isChecked}
                      onChange={(event) => {
                        updateAlarmData(event, element);
                      }}
                    />
                  </div>
                  <div className="tag-key w-alarm">
                    {t(
                      defaultStr(
                        domainAlarmList.find((item) => item.key === element.key)
                          ?.name
                      )
                    )}
                  </div>
                  <div className="tag-value flex-1">
                    {element.isNumber ? (
                      <TextInput
                        data-testid={`alarm-param-input-${element.key}`}
                        className={classNames(
                          {
                            error:
                              element.key === AlarmType.WRITE_BLOCKED &&
                              writeBlockError,
                          },
                          {
                            error:
                              element.key === AlarmType.FREE_STORAGE_SPACE &&
                              minFreeStorageError,
                          },
                          {
                            error:
                              element.key === AlarmType.NODE_UNREACHABLE &&
                              nodeMinError,
                          }
                        )}
                        type="number"
                        value={element.value.toString()}
                        onChange={(event) => {
                          updateAlarmDataValue(event, element);
                        }}
                      />
                    ) : (
                      "N/A"
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </HeaderPanel>

        <HeaderPanel
          contentNoPadding
          title={t("cluster:alarm.notification")}
          desc={t("cluster:alarm.domainAlarmDesc")}
        >
          <div className="pd-20">
            <FormItem
              optionTitle={t("cluster:alarm.email")}
              optionDesc={t("cluster:alarm.emailDesc")}
              errorText={
                (showRequireEmailError ? t("cluster:alarm.emailError") : "") ||
                (emailFormatError ? t("cluster:alarm.emailFormatError") : "")
              }
            >
              <TextInput
                className="m-w-75p"
                value={alarmData.input.email}
                onChange={(event) => {
                  setShowRequireEmailError(false);
                  setEmailFormatError(false);
                  setAlarmData((prev) => {
                    return {
                      ...prev,
                      input: {
                        ...prev.input,
                        email: event.target.value,
                      },
                    };
                  });
                }}
                placeholder="abc@example.com"
              />
            </FormItem>
          </div>
        </HeaderPanel>

        <div className="button-action text-right">
          <Button
            data-testid="alarm-cancel-button"
            disabled={loadingCreate}
            btnType="text"
            onClick={() => {
              backToDetailPage();
            }}
          >
            {t("button.cancel")}
          </Button>
          <Button
            data-testid="alarm-create-button"
            loading={loadingCreate}
            btnType="primary"
            onClick={() => {
              confirmCreateDomainAlarm();
            }}
          >
            {t("button.create")}
          </Button>
        </div>
      </div>
    </CommonLayout>
  );
};

export default DomainAlarm;
