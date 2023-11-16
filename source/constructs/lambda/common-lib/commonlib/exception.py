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
    GRAFANA_HAS_INSTALLED_ATHENA_PLUGIN_FAILED = "Grafana does not have installed Athena plugin"
    GRAFANA_DATA_SOURCE_PERMISSION_CHECK_FAILED = "Grafana data source permission check failed"
    GRAFANA_FOLDER_PERMISSION_CHECK_FAILED = "Grafana folder permission check failed"
    GRAFANA_DASHBOARDS_PERMISSION_CHECK_FAILED = "Grafana dashboards permission check failed"


class APIException(Exception):
    def __init__(self, code: ErrorCode, message: str = ""):
        self.type = code.name
        self.message = message if message else code.value

    def __str__(self) -> str:
        return f"[{self.type}] {self.message}"
