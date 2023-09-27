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
import { SIDE_BAR_OPEN_STORAGE_ID } from "assets/js/const";
import { AmplifyConfigType } from "types";

export enum ActionType {
  INCREMENT_NUM,
  DECREMENT_NUM,
  CLOSE_SIDE_MENU,
  OPEN_SIDE_MENU,
  OPEN_INFO_BAR,
  CLOSE_INFO_BAR,
  SET_INFO_BAR_TYPE,
  UPDATE_USER_EMAIL,
  UPDATE_DOMAIN_MAP,
  UPDATE_AMPLIFY_CONFIG,
}

export enum InfoBarTypes {
  ALARMS = "ALARMS",
  ACCESS_PROXY = "ACCESS_PROXY",
  LOG_PROCESSING = "LOG_PROCESSING",
  CREATION_METHOD_NETWORK = "CREATION_METHOD_NETWORK",
  LOG_PROCESSING_NETWORK = "LOG_PROCESSING_NETWORK",
  INGESTION_CREATION_METHOD = "INGESTION_CREATION_METHOD",
  SAMPLE_DASHBAORD = "SAMPLE_DASHBAORD",
  APACHE_SAMPLE_DASHBOARD = "APACHE_SAMPLE_DASHBOARD",
  LOG_LIFECYCLE = "LOG_LIFECYCLE",
  NGINX_LOG_FORMAT = "NGINX_LOG_FORMAT",
  NGINX_SAMPLE_LOG_PARSING = "NGINX_SAMPLE_LOG_PARSING",
  APACHE_SAMPLE_LOG_PARSING = "APACHE_SAMPLE_LOG_PARSING",
  LOG_CONFIG_PATH = "LOG_CONFIG_PATH",
  LOG_CONFIG_PATH_EKS = "LOG_CONFIG_PATH_EKS",
  APACHE_LOG_FORMAT = "APACHE_LOG_FORMAT",
  REGEX_LOG_FORMAT = "REGEX_LOG_FORMAT",
  INSTANCE_GROUP_CREATION_METHOD = "INSTANCE_GROUP_CREATION_METHOD",
  S3_FILE_TYPE = "S3_FILE_TYPE",
  EKS_PATTERN = "EKS_PATTERN",
  EKS_IAM_ROLE = "EKS_IAM_ROLE",
  CONFIG_TIME_FORMAT = "CONFIG_TIME_FORMAT",
  CONFIG_FILTER = "CONFIG_FILTER",
  PROXY_INSTANCE = "PROXY_INSTANCE",
  PROCESSOR_TYPE = "PROCESSOR_TYPE",
  PERMISSIONS_TYPE = "PERMISSIONS_TYPE",
  LOG_PATH = "LOG_PATH",
  BUFFER_LAYER = "BUFFER_LAYER",
  S3_PREFIX_FILTER = "S3_PREFIX_FILTER",
  PIPELINE_ALARM = "PIPELINE_ALARM",
}

export const InfoBarTitleMap: any = {
  ALARMS: "info:alarm.name",
  ACCESS_PROXY: "info:accessProxy.name",
  LOG_PROCESSING: "info:logProcessing.name",
  CREATION_METHOD_NETWORK: "info:creationMethod.name",
  LOG_PROCESSING_NETWORK: "info:logProcessingNetwork.name",
  INGESTION_CREATION_METHOD: "info:ingestionCreationMethod.name",
  INSTANCE_GROUP_CREATION_METHOD: "info:instanceGroupCreationMethod.name",
  SAMPLE_DASHBAORD: "info:sampleDashboard.name",
  APACHE_SAMPLE_DASHBOARD: "info:sampleDashboard.name",
  LOG_LIFECYCLE: "info:logLifecycle.name",
  NGINX_LOG_FORMAT: "info:nginxLogFormat.name",
  NGINX_SAMPLE_LOG_PARSING: "info:nginxLogParsing.name",
  APACHE_SAMPLE_LOG_PARSING: "info:apacheLogParsing.name",
  LOG_CONFIG_PATH: "info:logConfigPath.name",
  LOG_CONFIG_PATH_EKS: "info:logConfigPath.name",
  APACHE_LOG_FORMAT: "info:apacheLogFormat.name",
  REGEX_LOG_FORMAT: "info:regExLogFormat.name",
  S3_FILE_TYPE: "info:s3FileType.name",
  EKS_PATTERN: "info:eksPattern.name",
  EKS_IAM_ROLE: "info:eksIamRole.name",
  CONFIG_TIME_FORMAT: "info:configTimeFormat.name",
  CONFIG_FILTER: "info:configFilter.name",
  PROXY_INSTANCE: "info:proxyInstance.name",
  S3_PREFIX_FILTER: "info:s3PrefixFilter.name",
  PIPELINE_ALARM: "info:pipelineAlarm.name",
};

export interface AppStateProps {
  counter: number;
  userEmail: string;
  openSideMenu: boolean;
  amplifyConfig: any;
  domainMap: any;
  showInfoBar: boolean;
  infoBarType: InfoBarTypes | undefined;
}

const initialState: AppStateProps = {
  counter: 0,
  userEmail: "",
  domainMap: {},
  amplifyConfig: {},
  openSideMenu:
    localStorage.getItem(SIDE_BAR_OPEN_STORAGE_ID) === "close" ? false : true,
  showInfoBar: false,
  infoBarType: undefined,
};

export type Action =
  | {
      type: ActionType.INCREMENT_NUM;
    }
  | {
      type: ActionType.DECREMENT_NUM;
    }
  | {
      type: ActionType.UPDATE_USER_EMAIL;
      email: string;
    }
  | {
      type: ActionType.UPDATE_DOMAIN_MAP;
      domainMap: any;
    }
  | {
      type: ActionType.UPDATE_AMPLIFY_CONFIG;
      amplifyConfig: AmplifyConfigType;
    }
  | {
      type: ActionType.OPEN_INFO_BAR;
    }
  | {
      type: ActionType.CLOSE_INFO_BAR;
    }
  | {
      type: ActionType.SET_INFO_BAR_TYPE;
      infoBarType: InfoBarTypes | undefined;
    }
  | {
      type: ActionType.OPEN_SIDE_MENU;
    }
  | {
      type: ActionType.CLOSE_SIDE_MENU;
    };

const appReducer = (state = initialState, action: Action): AppStateProps => {
  switch (action.type) {
    case ActionType.INCREMENT_NUM:
      return { ...state, counter: state.counter + 1 };
    case ActionType.DECREMENT_NUM:
      return { ...state, counter: state.counter - 1 };
    case ActionType.UPDATE_USER_EMAIL:
      return { ...state, userEmail: action.email };
    case ActionType.UPDATE_DOMAIN_MAP:
      return { ...state, domainMap: action.domainMap };
    case ActionType.UPDATE_AMPLIFY_CONFIG:
      return { ...state, amplifyConfig: action.amplifyConfig };
    case ActionType.OPEN_INFO_BAR:
      return { ...state, showInfoBar: true };
    case ActionType.CLOSE_INFO_BAR:
      return { ...state, showInfoBar: false };
    case ActionType.SET_INFO_BAR_TYPE:
      return { ...state, infoBarType: action.infoBarType };
    case ActionType.OPEN_SIDE_MENU:
      return { ...state, openSideMenu: true };
    case ActionType.CLOSE_SIDE_MENU:
      return { ...state, openSideMenu: false };
    default:
      return state;
  }
};

export default appReducer;
