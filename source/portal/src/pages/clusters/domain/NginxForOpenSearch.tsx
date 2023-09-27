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
import Breadcrumb from "components/Breadcrumb";
import { useNavigate, useParams } from "react-router-dom";
import Select from "components/Select";
import {
  CreateProxyForOpenSearchMutationVariables,
  DomainDetails,
  Resource,
  ResourceType,
} from "API";
import { SelectItem } from "components/Select/select";
import { appSyncRequestMutation, appSyncRequestQuery } from "assets/js/request";
import { getDomainDetails, listResources } from "graphql/queries";
import MultiSelect from "components/MultiSelect";
import LoadingText from "components/LoadingText";
import { createProxyForOpenSearch } from "graphql/mutations";
import TextInput from "components/TextInput";
import ExtLink from "components/ExtLink";
import ValueWithLabel from "components/ValueWithLabel";
import CopyText from "components/CopyText";
import {
  buildACMLink,
  buildKeyPairsLink,
  buildSGLink,
  buildSubnetLink,
  buildVPCLink,
  domainIsValid,
} from "assets/js/utils";
import { useSelector } from "react-redux";
import { InfoBarTypes } from "reducer/appReducer";
import HelpPanel from "components/HelpPanel";
import SideMenu from "components/SideMenu";
import { useTranslation } from "react-i18next";
import {
  PROXY_INSTANCE_NUMBER_LIST,
  PROXY_INSTANCE_TYPE_LIST,
  AmplifyConfigType,
} from "types";
import { RootState } from "reducer/reducers";

const NginxForOpenSearch: React.FC = () => {
  const { id, name } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const breadCrumbList = [
    { name: t("name"), link: "/" },
    {
      name: name,
      link: `/clusters/opensearch-domains/detail/${id}`,
    },
    { name: t("cluster:proxy.name") },
  ];

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );
  const [domainInfo, setDomainInfo] = useState<
    DomainDetails | undefined | null
  >();
  const [loadingData, setLoadingData] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingRes, setLoadingRes] = useState(false);
  const [loadingSG, setLoadingSG] = useState(false);
  const [loadingCert, setLoadingCert] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);
  const [publicVpc, setPublicVpc] = useState("");
  const [subnetEmptyError, setSubnetEmptyError] = useState(false);
  const [sgEmptyError, setSgEmptyError] = useState(false);
  const [keyEmptyError, setKeyEmptyError] = useState(false);
  const [sslError, setSslError] = useState(false);

  const [certificateOptionList, setCertificateOptionList] = useState<
    SelectItem[]
  >([]);
  const [keyPairOptionList, setKeyPairOptionList] = useState<SelectItem[]>([]);
  const [publicSubnetOptionList, setPublicSubnetOptionList] = useState<
    SelectItem[]
  >([]);
  const [publicSecGroupList, setPublicSecGroupList] = useState<SelectItem[]>(
    []
  );
  const [publicSubnet, setPublicSubnet] = useState<string[]>([]);
  const [publicSecGroup, setPublicSecGroup] = useState("");
  const [nginxForOpenSearch, setNginxForOpenSearch] =
    useState<CreateProxyForOpenSearchMutationVariables>({
      id: "",
      input: {
        customEndpoint: "",
        cognitoEndpoint: "",
        proxyInstanceType: "t3.micro",
        proxyInstanceNumber: "1",
        vpc: {
          securityGroupId: "",
          publicSubnetIds: "",
          privateSubnetIds: "",
          vpcId: "",
        },
        certificateArn: "",
        keyName: "",
      },
    });

  const [showDomainInvalid, setShowDomainInvalid] = useState(false);

  const convertResourceToOptionList = (
    resList: Resource[],
    type: ResourceType
  ): SelectItem[] => {
    const tmpOptionList: SelectItem[] = [];
    resList.forEach((element) => {
      if (type === ResourceType.VPC) {
        tmpOptionList.push({
          name: `${element.id}(${element.name})`,
          value: element.id,
        });
      }
      if (type === ResourceType.Certificate) {
        tmpOptionList.push({
          name: `${element.name}`,
          value: element.id,
        });
      }
      if (type === ResourceType.KeyPair) {
        tmpOptionList.push({
          name: `${element.name}(${element.id})`,
          value: element.name,
        });
      }
      if (type === ResourceType.SecurityGroup) {
        tmpOptionList.push({
          name: `${element.id}(${element.name})`,
          value: element.id,
        });
      }
      if (type === ResourceType.Subnet) {
        tmpOptionList.push({
          name: `${element.id}(${element.name})`,
          value: element.id,
          optTitle: element.description || "",
        });
      }
    });

    return tmpOptionList;
  };

  const getResources = async (type: ResourceType, parentId?: string) => {
    try {
      if (type === ResourceType.SecurityGroup) {
        setLoadingSG(true);
      } else if (type === ResourceType.Certificate) {
        setLoadingCert(true);
      } else if (type === ResourceType.KeyPair) {
        setLoadingKey(true);
      } else {
        setLoadingRes(true);
      }

      const resData: any = await appSyncRequestQuery(listResources, {
        type: type,
        parentId: parentId,
      });
      const dataList = resData.data.listResources;
      const list = convertResourceToOptionList(dataList, type);

      if (type === ResourceType.Subnet) {
        setPublicSubnetOptionList(list);
      }
      if (type === ResourceType.SecurityGroup) {
        setLoadingSG(false);
        setPublicSecGroupList(list);
      }
      if (type === ResourceType.KeyPair) {
        setLoadingKey(false);
        setKeyPairOptionList(list);
      }
      if (type === ResourceType.Certificate) {
        setLoadingCert(false);
        setCertificateOptionList(list);
      }
      setLoadingRes(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getDomainById = async () => {
    try {
      setLoadingData(true);
      const resData: any = await appSyncRequestQuery(getDomainDetails, {
        id: decodeURIComponent(id || ""),
      });
      const dataDomain: DomainDetails = resData.data.getDomainDetails;
      setDomainInfo(dataDomain);
      setPublicVpc(dataDomain?.vpc?.vpcId || "");
      setNginxForOpenSearch(
        (prev: CreateProxyForOpenSearchMutationVariables) => {
          return {
            ...prev,
            id: dataDomain.id,
            input: {
              ...prev.input,
              cognitoEndpoint: dataDomain.cognito?.domain || "",
              vpc: {
                ...prev.input.vpc,
                privateSubnetIds: dataDomain?.vpc?.privateSubnetIds || "",
                vpcId: dataDomain?.vpc?.vpcId || "",
              },
            },
          };
        }
      );
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
      console.error(error);
    }
  };

  const backToDetailPage = () => {
    navigate(`/clusters/opensearch-domains/detail/${id}`);
  };

  const confirmCreateNginxForOpenSearch = async () => {
    // check subnet
    if (
      !nginxForOpenSearch.input.vpc.publicSubnetIds ||
      nginxForOpenSearch.input.vpc.publicSubnetIds.split(",").length < 2
    ) {
      setSubnetEmptyError(true);
      return;
    }

    // check security group
    if (!nginxForOpenSearch.input.vpc.securityGroupId) {
      setSgEmptyError(true);
      return;
    }

    // check instance key
    if (!nginxForOpenSearch.input.keyName) {
      setKeyEmptyError(true);
      return;
    }

    // Check Customer Domain Validation
    if (
      nginxForOpenSearch.input.customEndpoint &&
      !domainIsValid(nginxForOpenSearch.input.customEndpoint)
    ) {
      setShowDomainInvalid(true);
      return;
    }

    // Check ssl certificate
    if (!nginxForOpenSearch.input.certificateArn) {
      setSslError(true);
      return;
    }

    // set proxy instance number to int
    try {
      setLoadingCreate(true);
      const createRes = await appSyncRequestMutation(
        createProxyForOpenSearch,
        nginxForOpenSearch
      );
      console.info("createRes:", createRes);
      setLoadingCreate(false);
      backToDetailPage();
    } catch (error) {
      setLoadingCreate(false);
      console.error(error);
    }
  };

  useEffect(() => {
    if (publicVpc) {
      getResources(ResourceType.Subnet, publicVpc);
      getResources(ResourceType.SecurityGroup, publicVpc);
    }
  }, [publicVpc]);

  useEffect(() => {
    getDomainById();
    getResources(ResourceType.KeyPair);
    getResources(ResourceType.Certificate);
  }, []);

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
              <HeaderPanel title={t("cluster:proxy.logProcessNetwork")}>
                <div className="flex value-label-span">
                  <div className="flex-1">
                    <ValueWithLabel label={t("cluster:proxy.clusterVPC")}>
                      <CopyText text={domainInfo?.vpc?.vpcId || ""}>
                        <ExtLink
                          to={buildVPCLink(
                            amplifyConfig.aws_project_region,
                            domainInfo?.vpc?.vpcId || ""
                          )}
                        >
                          {domainInfo?.vpc?.vpcId || ""}
                        </ExtLink>
                      </CopyText>
                    </ValueWithLabel>
                  </div>

                  <div className="flex-1 border-left-c">
                    <ValueWithLabel label={t("cluster:proxy.subnetGroup")}>
                      <div>
                        {domainInfo?.vpc?.privateSubnetIds
                          ?.split(",")
                          .map((element) => {
                            return (
                              <div key={element}>
                                <ExtLink
                                  to={buildSubnetLink(
                                    amplifyConfig.aws_project_region,
                                    element
                                  )}
                                >
                                  {element}
                                </ExtLink>
                              </div>
                            );
                          })}
                        {domainInfo?.vpc?.publicSubnetIds
                          ?.split(",")
                          .map((element) => {
                            return element ? (
                              <div key={element}>
                                <ExtLink
                                  to={buildSubnetLink(
                                    amplifyConfig.aws_project_region,
                                    element
                                  )}
                                >
                                  {element}
                                </ExtLink>
                              </div>
                            ) : (
                              ""
                            );
                          })}
                      </div>
                    </ValueWithLabel>
                  </div>
                  <div className="flex-1 border-left-c">
                    <ValueWithLabel label={t("cluster:proxy.securityGroup")}>
                      <div>
                        <ExtLink
                          to={buildSGLink(
                            amplifyConfig.aws_project_region,
                            domainInfo?.vpc?.securityGroupId || ""
                          )}
                        >
                          {domainInfo?.vpc?.securityGroupId || ""}
                        </ExtLink>
                      </div>
                    </ValueWithLabel>
                  </div>
                </div>
              </HeaderPanel>

              <HeaderPanel
                title={t("cluster:proxy.publicProxy")}
                desc={t("cluster:proxy.publicProxyDesc")}
              >
                <FormItem
                  infoType={InfoBarTypes.PROXY_INSTANCE}
                  optionTitle={t("cluster:proxy.instanceType")}
                  optionDesc={t("cluster:proxy.instanceTypeDesc")}
                >
                  <Select
                    className="m-w-75p"
                    optionList={PROXY_INSTANCE_TYPE_LIST}
                    value={nginxForOpenSearch.input.proxyInstanceType || ""}
                    onChange={(event) => {
                      setNginxForOpenSearch(
                        (prev: CreateProxyForOpenSearchMutationVariables) => {
                          return {
                            ...prev,
                            input: {
                              ...prev.input,
                              proxyInstanceType: event.target.value,
                            },
                          };
                        }
                      );
                    }}
                  />
                </FormItem>

                <FormItem
                  infoType={InfoBarTypes.PROXY_INSTANCE}
                  optionTitle={t("cluster:proxy.instanceNumber")}
                  optionDesc={t("cluster:proxy.instanceNumberDesc")}
                >
                  <Select
                    className="m-w-75p"
                    optionList={PROXY_INSTANCE_NUMBER_LIST}
                    value={
                      nginxForOpenSearch.input.proxyInstanceNumber?.toString() ||
                      ""
                    }
                    onChange={(event) => {
                      setNginxForOpenSearch(
                        (prev: CreateProxyForOpenSearchMutationVariables) => {
                          return {
                            ...prev,
                            input: {
                              ...prev.input,
                              proxyInstanceNumber: event.target.value,
                            },
                          };
                        }
                      );
                    }}
                  />
                </FormItem>

                <FormItem
                  optionTitle={t("cluster:proxy.publicSubnets")}
                  optionDesc={t("cluster:proxy.publicSubnetsDesc")}
                  errorText={
                    subnetEmptyError ? t("cluster:proxy.subnetError") : ""
                  }
                >
                  <MultiSelect
                    className="m-w-75p"
                    loading={loadingRes}
                    optionList={publicSubnetOptionList}
                    value={publicSubnet}
                    onChange={(subnetIds) => {
                      if (subnetIds) {
                        setSubnetEmptyError(false);
                        setPublicSubnet(subnetIds);
                        setNginxForOpenSearch(
                          (prev: CreateProxyForOpenSearchMutationVariables) => {
                            return {
                              ...prev,
                              input: {
                                ...prev.input,
                                vpc: {
                                  ...prev.input.vpc,
                                  publicSubnetIds: subnetIds.join(","),
                                },
                              },
                            };
                          }
                        );
                      }
                    }}
                    placeholder={t("cluster:proxy.chooseSubnet")}
                    hasRefresh
                    clickRefresh={() => {
                      getResources(ResourceType.Subnet, publicVpc);
                    }}
                  />
                </FormItem>

                <FormItem
                  optionTitle={t("cluster:proxy.publicSG")}
                  optionDesc={t("cluster:proxy.publicSGDesc")}
                  errorText={sgEmptyError ? t("cluster:proxy.sgError") : ""}
                >
                  <Select
                    className="m-w-75p"
                    loading={loadingSG}
                    optionList={publicSecGroupList}
                    value={publicSecGroup}
                    onChange={(event) => {
                      setPublicSecGroup(event.target.value);
                      setSgEmptyError(false);
                      setNginxForOpenSearch(
                        (prev: CreateProxyForOpenSearchMutationVariables) => {
                          return {
                            ...prev,
                            input: {
                              ...prev.input,
                              vpc: {
                                ...prev.input.vpc,
                                securityGroupId: event.target.value,
                              },
                            },
                          };
                        }
                      );
                    }}
                    placeholder={t("cluster:proxy.chooseSG")}
                    hasRefresh
                    clickRefresh={() => {
                      getResources(ResourceType.SecurityGroup, publicVpc);
                    }}
                  />
                </FormItem>

                <FormItem
                  optionTitle={t("cluster:proxy.nginxKeyName")}
                  optionDesc={
                    <div>
                      {t("cluster:proxy.nginxKeyNameDesc1")}
                      <ExtLink
                        to={buildKeyPairsLink(amplifyConfig.aws_project_region)}
                      >
                        {t("cluster:proxy.keyPairs")}
                      </ExtLink>
                      {t("cluster:proxy.nginxKeyNameDesc2")}
                    </div>
                  }
                  errorText={keyEmptyError ? t("cluster:proxy.keyError") : ""}
                >
                  <Select
                    className="m-w-75p"
                    loading={loadingKey}
                    optionList={keyPairOptionList}
                    value={nginxForOpenSearch.input.keyName}
                    onChange={(event) => {
                      setKeyEmptyError(false);
                      setNginxForOpenSearch(
                        (prev: CreateProxyForOpenSearchMutationVariables) => {
                          return {
                            ...prev,
                            input: {
                              ...prev.input,
                              keyName: event.target.value,
                            },
                          };
                        }
                      );
                    }}
                    placeholder={t("cluster:proxy.chooseKeyName")}
                    hasRefresh
                    clickRefresh={() => {
                      getResources(ResourceType.KeyPair);
                    }}
                  />
                </FormItem>

                <div className="mt-10">
                  <FormItem
                    optionTitle={t("cluster:proxy.domainName")}
                    optionDesc={t("cluster:proxy.domainNameDesc")}
                    errorText={
                      showDomainInvalid
                        ? t("cluster:proxy.domainNameFormatError")
                        : ""
                    }
                  >
                    <TextInput
                      className="m-w-75p"
                      value={nginxForOpenSearch?.input.customEndpoint || ""}
                      onChange={(event) => {
                        setShowDomainInvalid(false);
                        setNginxForOpenSearch(
                          (prev: CreateProxyForOpenSearchMutationVariables) => {
                            return {
                              ...prev,
                              input: {
                                ...prev.input,
                                customEndpoint: event.target.value,
                              },
                            };
                          }
                        );
                      }}
                      placeholder="xxxxx.example.com"
                    />
                  </FormItem>

                  <FormItem
                    optionTitle={t("cluster:proxy.lbSSL")}
                    optionDesc={
                      <div>
                        {t("cluster:proxy.lbSSLDesc1")}
                        <ExtLink
                          to={buildACMLink(amplifyConfig.aws_project_region)}
                        >
                          {t("cluster:proxy.ACM")}
                        </ExtLink>
                        {t("cluster:proxy.lbSSLDesc2")}
                      </div>
                    }
                    errorText={sslError ? t("cluster:proxy.sslError") : ""}
                  >
                    <Select
                      className="m-w-75p"
                      loading={loadingCert}
                      optionList={certificateOptionList}
                      value={nginxForOpenSearch.input.certificateArn}
                      onChange={(event) => {
                        setSslError(false);
                        setNginxForOpenSearch(
                          (prev: CreateProxyForOpenSearchMutationVariables) => {
                            return {
                              ...prev,
                              input: {
                                ...prev.input,
                                certificateArn: event.target.value,
                              },
                            };
                          }
                        );
                      }}
                      placeholder={t("cluster:proxy.chooseSSL")}
                      hasRefresh
                      clickRefresh={() => {
                        getResources(ResourceType.Certificate);
                      }}
                    />
                  </FormItem>
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
                  {t("button.cancel")}
                </Button>
                <Button
                  loading={loadingCreate}
                  btnType="primary"
                  onClick={() => {
                    confirmCreateNginxForOpenSearch();
                  }}
                >
                  {t("button.create")}
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

export default NginxForOpenSearch;
