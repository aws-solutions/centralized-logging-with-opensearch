import FormItem from "components/FormItem";
import HeaderPanel from "components/HeaderPanel";
import Select from "components/Select";
import RefreshIcon from "@material-ui/icons/Refresh";
import React, { useEffect, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { InfoBarTypes } from "reducer/appReducer";
import { AmplifyConfigType, YesNo } from "types";
import TextInput from "components/TextInput";
import Button from "components/Button";
import { useAsyncData } from "assets/js/useAsyncData";
import { ListGrafanasResponse, Resource, ResourceType } from "API";
import { ApiResponse, appSyncRequestQuery } from "assets/js/request";
import { listGrafanas, listResources } from "graphql/queries";
import AutoComplete from "components/AutoComplete";
import { OptionType } from "components/AutoComplete/autoComplete";
import LoadingText from "components/LoadingText";
import { buildCreateS3Link } from "assets/js/utils";
import { CloudFrontTaskProps } from "../cloudfront/CreateCloudFront";
import { ELBTaskProps } from "../elb/CreateELB";
import { WAFTaskProps } from "../waf/CreateWAF";
import { pickBy } from "lodash";
import PagePanel from "components/PagePanel";
import ExtButton from "components/ExtButton";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "reducer/reducers";
import { Dispatch } from "redux";
import {
  CFN_KEYS_FROM_STATE,
  CreateLightEngineActionTypes,
  CreateLightEngineSate,
  ScheduleScale,
} from "reducer/createLightEngine";
import { validateGrafanaConnection } from "reducer/grafana";
import { GrafanaCheckList } from "pages/lightEngine/grafana/components/GrafanaCheckList";
import { Grid, styled } from "@material-ui/core";
import { SelectItem } from "components/Select/select";
import { CENTRALIZED_BUCKET_PREFIX } from "assets/js/helpers/lightEngineHelper";
import ExtLink from "components/ExtLink";
import { CloudTrailTaskProps } from "../cloudtrail/CreateCloudTrail";
import { VpcLogTaskProps } from "../vpc/CreateVPC";
import { RDSTaskProps } from "../rds/CreateRDS";

const SCHEDULE_DOC_HREF =
  "https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html";

const ScheduleSpan = styled("span")(() => ({
  fontSize: "16px",
  fontWeight: "bolder",
}));

const ConfigLightEngine = () => {
  const lightEngine = useSelector(
    (state: RootState) => state.createLightEngine
  );
  const {
    sampleDashboard,
    grafanaId,
    centralizedBucketName,
    centralizedTableName,
    logArchiveAge,
  } = lightEngine;
  const dispatch = useDispatch<Dispatch<any>>();
  const i18n = useTranslation();
  const { t } = i18n;
  const {
    data: listGrafanaResp,
    isLoadingData: isGrafanaLoading,
    reloadData: reloadGrafana,
  } = useAsyncData<ApiResponse<"listGrafanas", ListGrafanasResponse>>(
    () =>
      appSyncRequestQuery(listGrafanas, {
        page: 1,
        count: 99,
      }),
    []
  );
  const {
    data: listS3Resp,
    isLoadingData: isS3Loading,
    reloadData: reloadS3,
  } = useAsyncData<ApiResponse<"listResources", Resource[]>>(
    () =>
      appSyncRequestQuery(listResources, {
        type: ResourceType.S3Bucket,
        accountId: "",
      }),
    []
  );
  const grafanaOptionList = useMemo(
    () =>
      listGrafanaResp?.data.listGrafanas.grafanas?.map((grafana) => {
        const { id = "", name = "" } = grafana ?? {};
        return {
          name,
          value: id,
        };
      }),
    [listGrafanaResp]
  );
  const s3AutoCompleteList = useMemo(
    () =>
      listS3Resp?.data.listResources?.map(({ id, name }) => ({
        name: `${name}`,
        value: id,
      })),
    [listS3Resp]
  );

  const amplifyConfig: AmplifyConfigType = useSelector(
    (state: RootState) => state.app.amplifyConfig
  );

  const scheduleRateOptions = useMemo<SelectItem[]>(
    () => [
      {
        name: ScheduleScale.MIN,
        value: ScheduleScale.MIN,
      },
      {
        name: ScheduleScale.HOUR,
        value: ScheduleScale.HOUR,
      },
      {
        name: ScheduleScale.DAY,
        value: ScheduleScale.DAY,
      },
    ],
    []
  );

  useEffect(() => {
    if (amplifyConfig.default_logging_bucket) {
      dispatch({
        type: CreateLightEngineActionTypes.CENTRALIZED_BUCKET_NAME_CHANGED,
        value: amplifyConfig.default_logging_bucket,
      });
    }
  }, [amplifyConfig.default_logging_bucket]);

  return (
    <PagePanel title={t("step.analyticsEngine")}>
      <HeaderPanel title={t("lightengine:engine.create.configTitle")}>
        <FormItem
          infoType={InfoBarTypes.LIGHT_ENGINE_TABLE_NAME}
          optionTitle={t("lightengine:engine.create.centralTableTitle")}
          optionDesc={t("lightengine:engine.create.centralTableDesc")}
          errorText={lightEngine.centralizedTableNameError}
        >
          <TextInput
            className="m-w-75p"
            onChange={(e) =>
              dispatch({
                type: CreateLightEngineActionTypes.CENTRALIZED_TABLE_NAME_CHANGED,
                value: e.target.value,
              })
            }
            value={centralizedTableName}
            placeholder="table-name"
          />
        </FormItem>

        <FormItem
          optionTitle={t("lightengine:engine.create.centralBucketTitle")}
          optionDesc={t("lightengine:engine.create.centralBucketDesc")}
          errorText={lightEngine.centralizedBucketNameError}
        >
          <div className="inline-flex" style={{ width: "75%" }}>
            <div className="flex-1">
              <AutoComplete
                disabled={isS3Loading}
                placeholder={t(
                  "lightengine:engine.create.centralBucketPlaceholder"
                )}
                optionList={s3AutoCompleteList || []}
                value={
                  centralizedBucketName
                    ? {
                        name: centralizedBucketName,
                        value: centralizedBucketName,
                      }
                    : null
                }
                onChange={(_, data: OptionType) => {
                  dispatch({
                    type: CreateLightEngineActionTypes.CENTRALIZED_BUCKET_NAME_CHANGED,
                    value: data?.value,
                  });
                }}
              />
            </div>
            <div
              className="refresh-button"
              style={{ width: "60px", textAlign: "center" }}
            >
              <Button
                disabled={isS3Loading}
                btnType="icon"
                onClick={() => {
                  if (isS3Loading) {
                    return;
                  }
                  reloadS3();
                }}
              >
                {isS3Loading ? (
                  <LoadingText />
                ) : (
                  <RefreshIcon fontSize="small" />
                )}
              </Button>
            </div>
          </div>
          <ExtButton
            to={buildCreateS3Link(amplifyConfig.aws_appsync_region)}
            style={{ verticalAlign: "bottom" }}
          >
            {t("common:button.create")}
          </ExtButton>
        </FormItem>

        <FormItem
          infoType={InfoBarTypes.LIGHT_ENGINE_LOG_PROCESS}
          optionTitle={t("lightengine:engine.create.logProcessorExpTitle")}
          errorText={lightEngine.logProcessorScheduleExpError}
          optionDesc={
            <Trans
              i18={i18n}
              i18nKey="lightengine:engine.create.logProcessorExpDesc"
              components={[
                <ExtLink key="1" to={`${SCHEDULE_DOC_HREF}#rate-based`}>
                  1
                </ExtLink>,
              ]}
            />
          }
        >
          <Grid container spacing={2}>
            <Grid item className="flex align-center">
              <ScheduleSpan>rate(</ScheduleSpan>
            </Grid>
            <Grid item>
              <TextInput
                type="number"
                onChange={(e) =>
                  dispatch({
                    type: CreateLightEngineActionTypes.LOG_PROCESSOR_SCHEDULE_TIME_CHANGED,
                    value:
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value, 10),
                  })
                }
                value={`${lightEngine.logProcessorScheduleTime}`}
              />
            </Grid>
            <Grid item>
              <Select
                optionList={scheduleRateOptions}
                value={lightEngine.logProcessorScheduleScale}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  dispatch({
                    type: CreateLightEngineActionTypes.LOG_PROCESSOR_SCHEDULE_SCALE_CHANGED,
                    value: e.target.value,
                  });
                }}
              />
            </Grid>
            <Grid item className="flex align-center">
              <ScheduleSpan>)</ScheduleSpan>
            </Grid>
          </Grid>
        </FormItem>

        <FormItem
          optionTitle={t("lightengine:engine.create.sampleDashboardTitle")}
          optionDesc={t("lightengine:engine.create.sampleDashboardDesc")}
          infoType={InfoBarTypes.LIGHT_ENGINE_SAMPLE_DASHBOARD}
        >
          {Object.values(YesNo).map((key) => {
            return (
              <div key={key}>
                <label>
                  <input
                    value={sampleDashboard}
                    onChange={(event) => {
                      console.info(event);
                    }}
                    onClick={() => {
                      dispatch({
                        type: CreateLightEngineActionTypes.SAMPLE_DASHBOARD_CHANGED,
                        value: key,
                      });
                    }}
                    checked={sampleDashboard === key}
                    name="sampleDashboard"
                    type="radio"
                  />{" "}
                  {t(key.toLocaleLowerCase())}
                </label>
              </div>
            );
          })}
        </FormItem>
        {sampleDashboard === YesNo.Yes ? (
          <>
            <FormItem
              optionTitle={t("lightengine:grafana.name")}
              optionDesc={t("lightengine:grafana.desc")}
              errorText={lightEngine.grafanaIdError}
            >
              <div className="flex">
                <Select
                  loading={isGrafanaLoading}
                  disabled={isGrafanaLoading}
                  placeholder={t(
                    "lightengine:engine.create.grafanaPlaceholder"
                  )}
                  className="m-w-75p flex-1"
                  hasRefresh
                  optionList={grafanaOptionList || []}
                  value={grafanaId ?? ""}
                  clickRefresh={() => {
                    reloadGrafana();
                    if (lightEngine.grafanaId) {
                      dispatch(
                        validateGrafanaConnection({
                          id: lightEngine.grafanaId,
                        })
                      );
                    }
                  }}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    dispatch({
                      type: CreateLightEngineActionTypes.GRAFANA_ID_CHANGED,
                      value: e.target.value,
                    });
                    dispatch(
                      validateGrafanaConnection({
                        id: e.target.value,
                      })
                    );
                  }}
                />
                <ExtButton
                  className="ml-5"
                  to="/grafana/import"
                  style={{ verticalAlign: "bottom" }}
                >
                  {t("common:button.import")}
                </ExtButton>
              </div>
            </FormItem>
            <GrafanaCheckList />
          </>
        ) : (
          <></>
        )}
      </HeaderPanel>
      <HeaderPanel title={t("servicelog:cluster.logLifecycle")}>
        <FormItem
          optionTitle={t("lightengine:engine.create.logArchiveAgeTitle")}
          optionDesc={t("lightengine:engine.create.logArchiveAgeDesc")}
          errorText={lightEngine.logArchiveAgeError}
        >
          <TextInput
            className="m-w-75p"
            placeholder="30"
            type="number"
            onChange={(e) => {
              dispatch({
                type: CreateLightEngineActionTypes.LOG_ARCHIVE_AGE_CHANGED,
                value:
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10),
              });
            }}
            value={`${logArchiveAge}`}
          />
        </FormItem>
      </HeaderPanel>
    </PagePanel>
  );
};

// Map original AOS svc task params to light engine ingest params
const SVC_TASK_LIGHT_ENGINE_INGEST_MAP = {
  logBucketName: "bucket",
  logBucketPrefix: "prefix",
};

export const covertSvcTaskToLightEngine = (
  pipelineTask:
    | CloudFrontTaskProps
    | ELBTaskProps
    | WAFTaskProps
    | VpcLogTaskProps
    | CloudTrailTaskProps
    | RDSTaskProps,
  lightEngineState: CreateLightEngineSate
) => {
  const parameters = Object.entries(
    pickBy(lightEngineState, (_, key) => CFN_KEYS_FROM_STATE.includes(key))
  ).map(([k, v]) => {
    let value = v;
    let key = k;
    // convert sampleDashboard to boolean string
    if (k === "sampleDashboard") {
      key = "importDashboards";
      value = `${v === YesNo.Yes}`;
    }
    return {
      parameterKey: key,
      parameterValue: `${value ?? ""}`,
    };
  });
  parameters.push({
    parameterKey: "logProcessorSchedule",
    parameterValue: `rate(${lightEngineState.logProcessorScheduleTime} ${lightEngineState.logProcessorScheduleScale})`,
  });
  parameters.push({
    parameterKey: "centralizedBucketPrefix",
    parameterValue: CENTRALIZED_BUCKET_PREFIX,
  });

  // only pick ingestion params defined in SVC_TASK_LIGHT_ENGINE_INGEST_MAP
  const ingestion = Object.entries(SVC_TASK_LIGHT_ENGINE_INGEST_MAP).reduce(
    (ret, [k, v]) => {
      const value =
        pipelineTask.params[k as keyof typeof pipelineTask.params] ?? "";
      ret[v] = `${value}`;
      parameters.push({
        parameterKey: k,
        parameterValue: `${value}`,
      });
      return ret;
    },
    {} as Record<string, string>
  );
  return { parameters, ingestion };
};

export default ConfigLightEngine;
