# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import uuid
from enum import Enum
from typing import List, Optional
from datetime import datetime
from pydantic import (
    BaseModel,
    Field,
    constr,
    validator,
)

DEFAULT_TIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def now_iso8601():
    return datetime.utcnow().strftime(DEFAULT_TIME_FORMAT)


class CommonEnum(str, Enum):
    def __str__(self) -> str:
        return self.value

    def __repr__(self) -> str:
        return self.value


class AgentTypeEnum(CommonEnum):
    FLUENT_BIT = "fluent-bit"
    NONE = None


class LogTypeEnum(CommonEnum):
    JSON = "JSON"
    REGEX = "Regex"
    NGINX = "Nginx"
    APACHE = "Apache"
    SYSLOG = "Syslog"
    SINGLELINE_TEXT = "SingleLineText"
    MULTILINE_TEXT = "MultiLineText"


class SyslogParserEnum(CommonEnum):
    RFC5424 = "RFC5424"
    RFC3164 = "RFC3164"
    CUSTOM = "CUSTOM"


class MultiLineLogParserEnum(CommonEnum):
    JAVA_SPRING_BOOT = "JAVA_SPRING_BOOT"
    CUSTOM = "CUSTOM"


class BufferTypeEnum(CommonEnum):
    NONE = "None"
    KDS = "KDS"
    S3 = "S3"
    MSK = "MSK"


class StatusEnum(CommonEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    CREATING = "CREATING"
    DELETING = "DELETING"
    ERROR = "ERROR"
    REGISTERED = "REGISTERED"
    DISTRIBUTING = "DISTRIBUTING"


class DomainStatus(CommonEnum):
    ACTIVE = "ACTIVE"
    IMPORTED = "IMPORTED"
    IN_PROGRESS = "IN_PROGRESS"
    INACTIVE = "INACTIVE"
    UNKNOWN = "UNKNOWN"
    FAILED = "FAILED"


class DomainStatusCheckType(CommonEnum):
    FAILED = "FAILED"
    PASSED = "PASSED"


class DomainImportType(CommonEnum):
    AUTOMATIC = "AUTOMATIC"
    MANUAL = "MANUAL"


class DomainStatusCheckItem(CommonEnum):
    DOMAIN_ENGINE = "OpenSearchDomainEngine"
    DOMAIN_VERSION = "OpenSearchDomainVersion"
    NAT = "SolutionPrivateSubnetWithNAT"
    SECURITY_GROUP = "CheckOpenSearchSecurityGroup"
    NETWORK_ACL = "CheckOpenSearchNetworkACL"
    VPC_PEERING = "CheckVPCPeeringConnection"
    AOS_VPC_ROUTING = "CheckOpenSearchVPCRouteTable"
    SOLUTION_VPC_ROUTING = "CheckSolutionVPCRouteTable"
    DOMAIN_NETWORK_TYPE = "OpenSearchDomainNetworkType"


class GrafanaStatusCheckItem(CommonEnum):
    URL_CONNECTIVITY = "GrafanaURLConnectivity"
    TOKEN_VALIDITY = "GrafanaTokenValidity"
    HAS_INSTALLED_ATHENA_PLUGIN = "GrafanaHasInstalledAthenaPlugin"
    DATA_SOURCE_PERMISSION = "GrafanaDataSourcePermission"
    FOLDER_PERMISSION = "GrafanaFolderPermission"
    DASHBOARDS_PERMISSION = "GrafanaDashboardsPermission"


class ResourceStatus(CommonEnum):
    CREATED = "CREATED"
    UPDATED = "UPDATED"
    DELETED = "DELETED"
    REVERSED = "REVERSED"
    UNCHANGED = "UNCHANGED"
    ERROR = "ERROR"


class DomainRelatedResourceEnum(CommonEnum):
    VPC_PEERING = "VPCPeering"
    AOS_SECURITY_GROUP = "OpenSearchSecurityGroup"
    AOS_ROUTES = "OpenSearchRouteTables"
    AOS_NACL = "OpenSearchNetworkACL"
    SOLUTION_ROUTES = "SolutionRouteTables"


class LogSourceTypeEnum(CommonEnum):
    EC2 = "EC2"
    S3 = "S3"
    EKSCluster = "EKSCluster"
    Syslog = "Syslog"


class DeploymentEnvEnum(CommonEnum):
    EC2 = "EC2"
    EKSCluster = "EKSCluster"


class CodecEnum(CommonEnum):
    BEST_COMPRESSION = "best_compression"
    DEFAULT = "default"


class PipelineType(CommonEnum):
    APP = "APP"
    SERVICE = "SERVICE"


class PipelineAlarmType(CommonEnum):
    OLDEST_MESSAGE_AGE_ALARM = "OLDEST_MESSAGE_AGE_ALARM"
    PROCESSOR_ERROR_INVOCATION_ALARM = "PROCESSOR_ERROR_INVOCATION_ALARM"
    PROCESSOR_ERROR_RECORD_ALARM = "PROCESSOR_ERROR_RECORD_ALARM"
    PROCESSOR_DURATION_ALARM = "PROCESSOR_DURATION_ALARM"
    KDS_THROTTLED_RECORDS_ALARM = "KDS_THROTTLED_RECORDS_ALARM"
    FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM = "FLUENTBIT_OUTPUT_RETRIED_RECORDS_ALARM"


class PipelineAlarmStatus(CommonEnum):
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"


class PipelineMonitorStatus(CommonEnum):
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"


class IndexSuffix(CommonEnum):
    yyyy_MM_dd = "yyyy_MM_dd"
    yyyy_MM_dd_HH = "yyyy_MM_dd_HH"
    yyyy_MM = "yyyy_MM"
    yyyy = "yyyy"


class EngineType(CommonEnum):
    OPEN_SEARCH = "OpenSearch"
    LIGHT_ENGINE = "LightEngine"


class NotificationService(CommonEnum):
    SNS = "SNS"
    SES = "SES"
    
    
class Tag(BaseModel):
    key: str
    value: str


class BufferParam(BaseModel):
    paramKey: str
    paramValue: str


class Parameter(BaseModel):
    parameterKey: str
    parameterValue: str


class CommonModel(BaseModel):
    tags: Optional[List[Tag]] = []
    status: StatusEnum = StatusEnum.CREATING
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # https://github.com/pydantic/pydantic/issues/1409
    def dict(self, exclude_none=True, **kwargs):
        output = super().dict(exclude_none=exclude_none, **kwargs)
        for k, v in output.items():
            if isinstance(v, datetime):
                output[k] = v.strftime(DEFAULT_TIME_FORMAT)
        return output


class Vpc(BaseModel):
    privateSubnetIds: str
    publicSubnetIds: str
    securityGroupId: str
    vpcId: str


class AOSParams(BaseModel):
    vpc: Vpc
    opensearchArn: str
    opensearchEndpoint: str
    domainName: str
    indexPrefix: str = ""
    warmLogTransition: str
    coldLogTransition: str
    logRetention: str
    rolloverSize: str = ""
    codec: CodecEnum = CodecEnum.BEST_COMPRESSION
    indexSuffix: str = IndexSuffix.yyyy_MM_dd
    refreshInterval: str = ""
    shardNumbers: int
    replicaNumbers: int
    engine: str
    failedLogBucket: str


class LightEngineParams(BaseModel):
    stagingBucketPrefix: str
    centralizedBucketName: str
    centralizedBucketPrefix: str
    centralizedTableName: str
    centralizedMetricsTableName: Optional[str] = ""
    logProcessorSchedule: str
    logMergerSchedule: str
    logArchiveSchedule: str
    logMergerAge: str
    logArchiveAge: str
    importDashboards: str
    grafanaId: Optional[str] = ""
    recipients: str = ""
    enrichmentPlugins: Optional[str] = ""
    notificationService: Optional[NotificationService] = NotificationService.SNS


class MonitorDetail(BaseModel):
    status: PipelineMonitorStatus
    backupBucketName: str = ""
    errorLogPrefix: str = ""
    pipelineAlarmStatus: PipelineAlarmStatus = PipelineAlarmStatus.DISABLED
    snsTopicName: str = ""
    snsTopicArn: str = ""
    emails: str = ""

class OpenSearchIngestionInput(BaseModel):
    minCapacity: Optional[int]
    maxCapacity: Optional[int]

class AppPipeline(CommonModel):
    pipelineId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    indexPrefix: constr(to_lower=True) = ""
    bufferType: BufferTypeEnum = BufferTypeEnum.NONE
    bufferAccessRoleArn: str = ""
    bufferAccessRoleName: str = ""
    bufferResourceArn: str = ""
    bufferResourceName: str = ""
    bufferParams: List[BufferParam] = []
    aosParams: Optional[AOSParams] = None
    lightEngineParams: Optional[LightEngineParams] = None
    logConfigId: str
    logConfigVersionNumber: int
    stackId: str = ""
    osHelperFnArn: str = ""
    queueArn: str = ""
    logProcessorRoleArn: str = ""
    error: str = ""
    monitor: MonitorDetail
    osiParams: Optional[OpenSearchIngestionInput] = None
    processorLogGroupName: str = ""
    helperLogGroupName: str = ""
    logEventQueueName: str = ""
    osiPipelineName: Optional[str] = None
    engineType: EngineType = EngineType.OPEN_SEARCH


class RegularSpec(BaseModel):
    key: str
    type: str
    format: Optional[str] = None

    @validator("format", always=True)
    def _format_not_null_if_type_is_date(cls, v, values):
        if ("type" in values) and (values["type"] == "date") and (v is None):
            raise ValueError("format cannot be None if type is date")
        return v


class LogConfigFilterCondition(CommonEnum):
    INCLUDE = "Include"
    EXCLUDE = "Exclude"


class LogConfigFilter(BaseModel):
    key: str
    value: str
    condition: LogConfigFilterCondition


class FilterConfigMap(BaseModel):
    enabled: bool
    filters: List[LogConfigFilter] = []


class LogConfig(CommonModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version: int
    name: str
    logType: LogTypeEnum
    syslogParser: Optional[SyslogParserEnum] = None
    multilineLogParser: Optional[MultiLineLogParserEnum] = None
    filterConfigMap: FilterConfigMap = FilterConfigMap(enabled=False, filters=[])
    regex: str = ""
    jsonSchema: Optional[dict] = None
    regexFieldSpecs: List[RegularSpec]
    timeKey: str = ""
    timeOffset: str = ""
    timeKeyRegex: str = ""
    userLogFormat: str = ""
    userSampleLog: str = ""

    @staticmethod
    def find_in_regex_field_specs(
        regex_field_specs: List[RegularSpec], key: str
    ) -> Optional[RegularSpec]:
        for spec in regex_field_specs:
            if spec.key == key:
                return spec

        return None

    @validator("timeKey", always=True)
    def _time_key_must_have_date_format(cls, v, values):
        if "regexFieldSpecs" in values:
            time_key: str = v
            if time_key:
                spec = cls.find_in_regex_field_specs(
                    values["regexFieldSpecs"], time_key
                )
                if not spec:
                    raise ValueError(f"No regexFieldSpecs for time key: {time_key}")
                if spec.type != "date":
                    raise ValueError(
                        f'The time key: {time_key} type of regexFieldSpecs must be "date"'
                    )
                if not spec.format:
                    raise ValueError(
                        f"The time key: {time_key} format must not be empty"
                    )

        return v


class Param(BaseModel):
    paramKey: str
    paramValue: str


class Output(BaseModel):
    name: str
    roleArn: str = ""
    roleName: str = ""
    params: List[Param] = []


class Input(BaseModel):
    name: str
    params: List[Param] = []


class AppLogIngestion(CommonModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    accountId: Optional[str] = None
    region: Optional[str] = None
    appPipelineId: str
    sourceId: str
    sourceType: Optional[LogSourceTypeEnum] = None
    logPath: Optional[str] = None
    stackId: Optional[str]
    logConfig: Optional[LogConfig]
    input: Optional[Input] = None
    output: Optional[Output] = None
    autoAddPermission = False


class SyslogProtocol(CommonEnum):
    TCP = "TCP"
    UDP = "UDP"


class SyslogSource(BaseModel):
    protocol: SyslogProtocol
    port: int
    nlbArn: str = ""
    nlbDNSName: str = ""


class GroupTypeEnum(CommonEnum):
    EC2 = "EC2"
    ASG = "ASG"


class GroupPlatformEnum(CommonEnum):
    LINUX = "Linux"


class EC2Instances(BaseModel):
    instanceId: str


class Ec2Source(BaseModel):
    groupName: str
    groupType: GroupTypeEnum
    groupPlatform: GroupPlatformEnum
    asgName: str = ""
    instances: Optional[List[EC2Instances]]


class CRIEnum(CommonEnum):
    CONTAINERD = "containerd"
    DOCKER = "docker"


class DeploymentKindEnum(CommonEnum):
    DAEMON_SET = "DaemonSet"
    SIDECAR = "Sidecar"


class S3IngestionMode(CommonEnum):
    ONE_TIME = "ONE_TIME"
    ON_GOING = "ON_GOING"


class CompressionType(CommonEnum):
    GZIP = "GZIP"
    NONE = "NONE"


class EksSource(BaseModel):
    cri: CRIEnum
    deploymentKind: DeploymentKindEnum
    k8sVersion: Optional[str] = None

    eksClusterArn: str
    eksClusterName: str
    eksClusterSGId: str

    endpoint: str
    logAgentRoleArn: str
    oidcIssuer: str
    subnetIds: List[str] = []
    vpcId: str


class S3Source(BaseModel):
    mode: S3IngestionMode
    bucketName: str
    keyPrefix: str
    keySuffix: str
    compressionType: CompressionType = CompressionType.NONE


class LogSource(CommonModel):
    sourceId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: LogSourceTypeEnum = LogSourceTypeEnum.EC2
    accountId: str = ""
    region: str = ""
    ec2: Optional[Ec2Source] = None
    syslog: Optional[SyslogSource] = None
    eks: Optional[EksSource] = None
    s3: Optional[S3Source] = None
    status: StatusEnum = StatusEnum.ACTIVE

    @validator("syslog", always=True)
    def _syslog_not_null(cls, v, values):
        if (
            ("type" in values)
            and (values["type"] == LogSourceTypeEnum.Syslog)
            and (v is None)
        ):
            raise ValueError("syslog cannot be None when type is Syslog")
        return v

    @validator("eks", always=True)
    def _eks_not_null(cls, v, values):
        if (
            ("type" in values)
            and (values["type"] == LogSourceTypeEnum.EKSCluster)
            and (v is None)
        ):
            raise ValueError("eks cannot be None when type is EKSCluster")
        return v

    @validator("ec2", always=True)
    def _ec2_not_null(cls, v, values):
        if (
            ("type" in values)
            and (values["type"] == LogSourceTypeEnum.EC2)
            and (v is None)
        ):
            raise ValueError("ec2 cannot be None when type is EC2")
        return v

    @validator("s3", always=True)
    def _s3_not_null(cls, v, values):
        if (
            ("type" in values)
            and (values["type"] == LogSourceTypeEnum.S3)
            and (v is None)
        ):
            raise ValueError("s3 cannot be None when type is s3")
        return v


class Instance(CommonModel):
    id: str
    sourceId: str
    accountId: str = ""
    region: str = ""
    ingestionIds: List[str] = []


class InstanceIngestionDetail(CommonModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    instanceId: str
    sourceId: str
    accountId: str = ""
    region: str = ""
    ingestionId: str = ""
    ssmCommandId: str = ""
    ssmCommandStatus: str = ""
    details: str = ""



class SvcPipeline(CommonModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bufferResourceArn: str = ""
    bufferResourceName: str = ""
    deliveryStreamArn: str = ""
    deliveryStreamName: str = ""
    destinationType: BufferTypeEnum = BufferTypeEnum.NONE
    engineType: EngineType = EngineType.OPEN_SEARCH
    error: str = ""
    helperLogGroupName: str = ""
    logEventQueueArn: str = ""
    logEventQueueName: str = ""
    logSourceAccountId: str = ""
    logSourceRegion: str = ""
    monitor: MonitorDetail
    parameters: List[Parameter] = []
    processorLogGroupName: str = ""
    lightEngineParams: Optional[LightEngineParams] = None
    source: str = ""
    stackId: str = ""
    stackName: str = ""
    target: str = ""
    type: str = ""


class ExecutionStatus(CommonEnum):
    RUNNING = "Running"
    SUCCEEDED = "Succeeded"
    FAILED = "Failed"
    TIMED_OUT = "Timed_out"
    ABORTED = "Aborted"

class ETLLog(CommonModel):
    executionName: str
    taskId: str
    API: str
    data: Optional[str] = None
    startTime: str
    endTime: Optional[str] = None
    functionName: Optional[str] = None
    parentTaskId: str
    pipelineId: str
    pipelineIndexKey: str
    stateMachineName: str
    stateName: str
    status: ExecutionStatus
