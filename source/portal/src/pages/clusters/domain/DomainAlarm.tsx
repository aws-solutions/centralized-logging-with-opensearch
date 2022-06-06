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
import HeaderPanel from "components/HeaderPanel";
import FormItem from "components/FormItem";
import Button from "components/Button";
import Breadcrumb from "components/Breadcrumb";
import { RouteComponentProps, useHistory } from "react-router-dom";
import {
  AlarmInput,
  AlarmType,
  CreateAlarmForOpenSearchMutationVariables,
  DomainDetails,
} from "API";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getDomainDetails } from "graphql/queries";
import LoadingText from "components/LoadingText";
import TextInput from "components/TextInput";
import { AlarmParamType, domainAlramList } from "assets/js/const";
import { createAlarmForOpenSearch } from "graphql/mutations";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import { emailIsValid } from "assets/js/utils";
import { Alert } from "assets/js/alert";

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

interface MatchParams {
  id: string;
  name: string;
}

const DomainAlarm: React.FC<RouteComponentProps<MatchParams>> = (
  props: RouteComponentProps<MatchParams>
) => {
  const id: string = props.match.params.id;
  const name: string = props.match.params.name;
  const { t } = useTranslation();
  const history = useHistory();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: name,
      link: `/clusters/opensearch-domains/detail/${id}`,
    },
    { name: t("cluster:alarm.name") },
  ];

  const [domainInfo, setDomainInfo] = useState<
    DomainDetails | undefined | null
  >();
  const [loadingData, setLoadingData] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  // const [curDomain, setCurDomain] = useState<DomainDetails>();
  const [showRequireEmailError, setShowRequireEmailError] = useState(false);
  const [emailFormatError, setEmailFormatError] = useState(false);
  const [alarmData, setAlarmData] = useState<DomainAlarmProps>({
    id: decodeURIComponent(id),
    input: {
      email: "",
      phone: "",
      phonePostNum: "",
      phoneNum: "",
      alarmParams: domainAlramList,
    },
  });

  const getDomainById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getDomainDetails, {
        id: decodeURIComponent(id),
      });
      console.info("resData:", resData);
      const dataDomain: DomainDetails = resData.data.getDomainDetails;
      setDomainInfo(dataDomain);
      console.info("domainInfo?.vpc?.vpcId:", domainInfo?.vpc?.vpcId);
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  useEffect(() => {
    getDomainById();
  }, []);

  const backToDetailPage = () => {
    history.push({
      pathname: `/clusters/opensearch-domains/detail/${id}`,
    });
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
    const alarmsList: AlarmInput[] = [];
    alarmData.input.alarmParams.forEach((element) => {
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
    // alarmParamData.id = alarmData.id;
    // alarmParamData.input.alarms = ;
    console.info("alarmParamData:", alarmParamData);
    // return;
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
    console.info("alarmData:", alarmData);
  }, [alarmData]);

  return (
    <div className="lh-main-content">
      <SideMenu />
      <div className="lh-container">
        <div className="lh-content">
          <div className="service-log">
            <Breadcrumb list={breadCrumbList} />
          </div>
          {loadingData ? (
            <LoadingText text="" />
          ) : (
            <div className="m-w-1024">
              <HeaderPanel
                contentNoPadding
                title={t("cluster:alarm.domainAlarm")}
                desc={t("cluster:alarm.domainAlarmDesc")}
              >
                <div className="pd-20">
                  <FormItem
                    optionTitle={t("cluster:alarm.email")}
                    optionDesc={t("cluster:alarm.emailDesc")}
                    errorText={
                      showRequireEmailError
                        ? t("cluster:alarm.emailError")
                        : emailFormatError
                        ? t("cluster:alarm.emailFormatError")
                        : ""
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

                  {/* <FormItem
                    optionTitle="SMS Notification - optional"
                    optionDesc="Notification will be sent to "
                  >
                    <div className="flex m-w-75p">
                      <div style={{ width: 100, padding: "0 15px 0 0" }}>
                        <TextInput
                          value={alarmData.input.phonePostNum}
                          onChange={(event) => {
                            setAlarmData((prev) => {
                              return {
                                ...prev,
                                input: {
                                  ...prev.input,
                                  phone:
                                    event.target.value + prev.input.phoneNum,
                                  phonePostNum: event.target.value,
                                },
                              };
                            });
                          }}
                          placeholder="+1"
                        />
                      </div>
                      <div className="flex-1">
                        <TextInput
                          value={alarmData.input.phoneNum}
                          onChange={(event) => {
                            setAlarmData((prev) => {
                              return {
                                ...prev,
                                input: {
                                  ...prev.input,
                                  phone:
                                    prev.input.phonePostNum +
                                    event.target.value,
                                  phoneNum: event.target.value,
                                },
                              };
                            });
                          }}
                          placeholder="60111111"
                        />
                      </div>
                    </div>
                  </FormItem> */}
                </div>

                <div>
                  <div className="flex show-tag-list">
                    <div className="checkbox">
                      <input
                        type="checkbox"
                        onChange={(event) => {
                          if (event.target.checked) {
                            setAlarmData((prev) => {
                              const prevObj: any = JSON.parse(
                                JSON.stringify(prev)
                              );
                              prevObj.input.alarmParams.forEach(
                                (element: any) => {
                                  element.isChecked = true;
                                }
                              );
                              return prevObj;
                            });
                          } else {
                            setAlarmData((prev) => {
                              const prevObj: any = JSON.parse(
                                JSON.stringify(prev)
                              );
                              prevObj.input.alarmParams.forEach(
                                (element: any) => {
                                  element.isChecked = false;
                                }
                              );
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
                  {alarmData.input.alarmParams.map((element, key) => {
                    return (
                      <div key={key} className="flex show-tag-list">
                        <div className="checkbox">
                          <input
                            type="checkbox"
                            checked={element.isChecked}
                            onChange={(event) => {
                              setAlarmData((prev) => {
                                const prevObj: any = JSON.parse(
                                  JSON.stringify(prev)
                                );
                                const paramIndex =
                                  prevObj.input.alarmParams.findIndex(
                                    (item: any) => item.key === element.key
                                  );
                                prevObj.input.alarmParams[
                                  paramIndex
                                ].isChecked = event.target.checked;
                                if (!element.isNumber) {
                                  prevObj.input.alarmParams[paramIndex].value =
                                    event.target.checked;
                                }
                                return prevObj;
                              });
                            }}
                          />
                        </div>
                        <div className="tag-key w-alarm">
                          {t(
                            domainAlramList.find(
                              (item) => item.key === element.key
                            )?.name || ""
                          )}
                        </div>
                        <div className="tag-value flex-1">
                          {element.isNumber ? (
                            <TextInput
                              type="number"
                              value={element.value.toString()}
                              onChange={(event) => {
                                setAlarmData((prev) => {
                                  const prevObj: any = JSON.parse(
                                    JSON.stringify(prev)
                                  );
                                  const paramIndex =
                                    prevObj.input.alarmParams.findIndex(
                                      (item: any) => item.key === element.key
                                    );
                                  if (element.isNumber) {
                                    prevObj.input.alarmParams[
                                      paramIndex
                                    ].value = event.target.value;
                                  }
                                  return prevObj;
                                });
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

              <div className="button-action text-right">
                <Button
                  disabled={loadingCreate}
                  btnType="text"
                  onClick={() => {
                    backToDetailPage();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  loading={loadingCreate}
                  btnType="primary"
                  onClick={() => {
                    confirmCreateDomainAlarm();
                  }}
                >
                  Create
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <HelpPanel />
    </div>
  );
};

export default DomainAlarm;
