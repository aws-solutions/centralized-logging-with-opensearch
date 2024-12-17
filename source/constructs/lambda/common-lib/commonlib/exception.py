# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


from enum import Enum


class ErrorCode(Enum):
    OVERLAP_WITH_INACTIVE_INDEX_PREFIX = "OVERLAP_WITH_INACTIVE_INDEX_PREFIX"
    DUPLICATED_WITH_INACTIVE_INDEX_PREFIX = "DUPLICATED_WITH_INACTIVE_INDEX_PREFIX"
    DUPLICATED_INDEX_PREFIX = "Duplicated Index Prefix"
    OVERLAP_INDEX_PREFIX = "Overlapped Index prefix"
    ITEM_NOT_FOUND = "Item is not found"
    ACCOUNT_NOT_FOUND = "Account is not found"
    OPENSEARCH_DOMAIN_NOT_FOUND = "OpenSearch domain is not found"
    ITEM_ALREADY_EXISTS = "Item already exists"
    ACCOUNT_ALREADY_EXISTS = "Account already exits"
    INVALID_OPENSEARCH_DOMAIN_STATUS = "OpenSearch domain is in an invalid status"
    INVALID_INDEX_MAPPING = "Invalid index mapping"
    INVALID_BUFFER_PARAMETERS = "Invalid buffer parameters"
    INVALID_ITEM = "Invalid item specified for the action"
    UNSUPPORTED_ACTION = "Unsupported action specified"
    UNKNOWN_ERROR = "Unknown exception occurred"
    DOMAIN_NOT_FOUND_ERROR = "OpenSearch Domain Not Found"
    AOS_NOT_IN_VPC = "Public network type is not supported, only OpenSearch domain within VPC can be imported"
    EKS_CLUSTER_NOT_CLEANED = "The domain is associated with an imported EKS cluster. Please remove the associated EKS cluster first."
    ASSOCIATED_STACK_UNDER_PROCESSING = "The domain is associated with a stack that is under processing. Please remove the associated stack first."
    SVC_PIPELINE_NOT_CLEANED = "The domain is associated with a service pipeline. Please remove the associated service pipeline first."
    APP_PIPELINE_NOT_CLEANED = "The domain is associated with an application pipeline. Please remove the associated application pipeline first."
    DOMAIN_ALREADY_IMPORTED = "The domain is already imported"
    DOMAIN_NOT_ACTIVE = "The domain is not active"
    DOMAIN_UNDER_PROCESSING = "The domain is under processing"
    DOMAIN_RELATED_RESOURCES_REVERSE_FAILED = (
        "The domain related resources reverse failed"
    )
    EKS_CLUSTER_ALREADY_IMPORTED = "The EKS cluster is already imported"
    IMPORT_OPENSEARCH_DOMAIN_FAILED = "Import OpenSearch domain failed"
    REMOVE_OPENSEARCH_DOMAIN_FAILED = "Remove OpenSearch domain failed"
    VALUE_ERROR = "Value error"
    UNSUPPORTED_DOMAIN_ENGINE = "Unsupported domain engine"
    DOMAIN_NETWORK_TYPE_NOT_PRIVATE = "Domain network type is not private"
    OLD_DOMAIN_VERSION = "Unsupported domain version"
    SUBNET_WITHOUT_NAT = "The solution private subnet must has NAT"
    AOS_SECURITY_GROUP_CHECK_FAILED = "Please check the OpenSearch Security Group"
    NETWORK_ACL_CHECK_FAILED = "Please check the OpenSearch Network ACL"
    VPC_PEERING_CHECK_FAILED = "Please check the VPC Peering network connection"
    AOS_VPC_ROUTING_CHECK_FAILED = "Please check the route table for OpenSearch subnet"
    SOLUTION_VPC_ROUTING_CHECK_FAILED = (
        "Please check the route table for Solution subnet"
    )
    UPDATE_CWL_ROLE_FAILED = "Update centralized cloudwatch role failed"
    ASSUME_ROLE_CHECK_FAILED = "EKS assume role check failed"
    UNSUPPORTED_ACTION_HAS_INGESTION = "UNSUPPORTED_ACTION_HAS_INGESTION"
    UNSUPPORTED_ACTION_SOURCE_HAS_INGESTION = "UNSUPPORTED_ACTION_SOURCE_HAS_INGESTION"
    # Grafana Exception
    GRAFANA_URL_CONNECTIVITY_FAILED = "Grafana URL connectivity check failed"
    GRAFANA_TOKEN_VALIDATION_FAILED = "Grafana token validation failed"
    GRAFANA_HAS_INSTALLED_ATHENA_PLUGIN_FAILED = (
        "Grafana does not have installed Athena plugin"
    )
    GRAFANA_DATA_SOURCE_PERMISSION_CHECK_FAILED = (
        "Grafana data source permission check failed"
    )
    GRAFANA_FOLDER_PERMISSION_CHECK_FAILED = "Grafana folder permission check failed"
    GRAFANA_DASHBOARDS_PERMISSION_CHECK_FAILED = (
        "Grafana dashboards permission check failed"
    )
    OVERLAPPED_EVENT_NOTIFICATIONS_PREFIX = "Overlapped Amazon S3 Bucket Prefix"
    S3_BUCKET_CHECK_FAILED = (
        "Failed to detect S3 storage bucket, please check if it is correct"
    )


class APIException(Exception):
    def __init__(self, code: ErrorCode, message: str = ""):
        self.type = code.name
        self.message = message if message else code.value

    def __str__(self) -> str:
        return f"[{self.type}] {self.message}"


class Issue(type):
    TYPE: str
    CODE: str
    DETAILS: str


class YamlSyntaxError(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "YAML_SYNTAX_ERROR"
    DETAILS = (
        "The YAML file has syntax error, please fix all syntax error and upload again."
    )


class InvalidElement(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "INVALID_ELEMENT"
    DETAILS = (
        "The element {element} is not valid, please include only supported element."
    )


class InvalidResource(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "INVALID_RESOURCE"
    DETAILS = "The resource {resource} is not found."


class InvalidResourceStatus(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "INVALID_RESOURCE_STATUS"
    DETAILS = "The resource {resource} current status does not allow pipeline creation, please check the resource's status."


class InvalidBucket(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "INVALID_BUCKET"
    DETAILS = "The bucket {bucket} is not exists or is not in the region where the Solution is deployed."


class BucketNotificationOverlap(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "BUCKET_NOTIFICATION_OVERLAP"
    DETAILS = "Configuration is ambiguously defined. Cannot have overlapping suffixes in two rules if the prefixes are overlapping for the same event type."


class InvalidValue(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "INVALID_VALUE"
    DETAILS = "The Value {value} is not valid for the {key}."


class InvalidEnum(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "INVALID_ENUM"
    DETAILS = (
        "The Value {value} is not valid for the {enum}, Supported values: {values}."
    )


class MissingElement(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "MISSING_ELEMENT"
    DETAILS = (
        "Element {element} is required, please add element {element} to the {parent}."
    )


class MismatchDataType(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "MISMATCH_DATA_TYPE"
    DETAILS = "The value {value} does not match the expected data type {data_type}."


class MissingVersion(metaclass=Issue):
    TYPE = "SUGGESTION"
    CODE = "MISSING_VERSION"
    DETAILS = "We recommend that you specify element {element}. If not specified, the latest version will be used."


class HTTPRequestError(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "HTTP_REQUEST_ERROR"
    DETAILS = "{msg}"


class UnsupportedLogSource(metaclass=Issue):
    TYPE = "WARNING"
    CODE = "UNSUPPORTED_LOG_SOURCE"
    DETAILS = "Unsupported Log Source, will be ignored during pipeline creation."


class OpenSearchIndexOverlap(metaclass=Issue):
    TYPE = "ERROR"
    CODE = "OPENSEARCH_INDEX_OVERLAP"
    DETAILS = "{msg}"


class IssueCode:
    YAML_SYNTAX_ERROR = YamlSyntaxError
    INVALID_ELEMENT = InvalidElement
    INVALID_RESOURCE = InvalidResource
    INVALID_RESOURCE_STATUS = InvalidResourceStatus
    INVALID_BUCKET = InvalidBucket
    BUCKET_NOTIFICATION_OVERLAP = BucketNotificationOverlap
    INVALID_VALUE = InvalidValue
    MISSING_ELEMENT = MissingElement
    MISMATCH_DATA_TYPE = MismatchDataType
    MISSING_VERSION = MissingVersion
    INVALID_ENUM = InvalidEnum
    HTTP_REQUEST_ERROR = HTTPRequestError
    UNSUPPORTED_LOG_SOURCE = UnsupportedLogSource
    OPENSEARCH_INDEX_OVERLAP = OpenSearchIndexOverlap
