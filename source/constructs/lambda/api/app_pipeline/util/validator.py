import logging

from fnmatch import fnmatchcase
from boto3.dynamodb.conditions import Attr
from common import APIException, ErrorCode

logger = logging.getLogger()
logger.setLevel(logging.INFO)


class AppPipelineValidator:
    def __init__(self, app_pipeline_table):
        self.app_pipeline_table = app_pipeline_table

    def validate_buffer_params(self, buffer_type: str, buffer_params: list):

        required_params = self._get_required_params(buffer_type)
        if not required_params:
            return

        buffer_names = [param["paramKey"] for param in buffer_params]
        missing_params = [
            param for param in required_params if param not in buffer_names
        ]

        if missing_params:
            raise APIException(
                "Missing buffer parameters %s for buffer type %s",
                ",".join(missing_params),
                buffer_type,
            )

    def _get_required_params(self, buffer_type: str) -> list:
        if buffer_type == "S3":
            return [
                "logBucketName",
                "logBucketPrefix",
                "defaultCmkArn",
                "maxFileSize",
                "uploadTimeout",
                "compressionType",
                "s3StorageClass",
            ]
        elif buffer_type == "KDS":
            return ["shardCount", "minCapacity", "maxCapacity", "enableAutoScaling"]
        elif buffer_type == "MSK":
            return [
                "mskClusterArn",
                "mskClusterName",
                "topic",
                "mskBrokerServers",
            ]
        else:
            # for No buffer
            return []

    def validate_duplicate_index_prefix(self, args: dict):
        aos_paras = args["aosParams"]

        # Check if index prefix is duplicated in the same opensearch
        index_prefix = str(aos_paras["indexPrefix"])
        domain_name = str(aos_paras["domainName"])
        res = self.app_pipeline_table.scan(
            FilterExpression=Attr("status").is_in(
                ["INACTIVE", "ACTIVE", "CREATING", "DELETING"]
            )
            & Attr("aosParams.indexPrefix").eq(index_prefix)
            & Attr("aosParams.domainName").eq(domain_name)
        )
        if res["Count"] > 0:
            msg = f"Duplicate index prefix: {index_prefix}"
            if (
                len(
                    list(
                        filter(lambda each: each["status"] == "INACTIVE", res["Items"])
                    )
                )
                > 0
            ):
                if args.get("force"):
                    logger.warn(f"Force continue! {msg}")
                else:
                    raise APIException(
                        msg, ErrorCode.DUPLICATED_WITH_INACTIVE_INDEX_PREFIX
                    )
            else:
                raise APIException(msg, ErrorCode.DUPLICATED_INDEX_PREFIX)

    def validate_index_prefix_overlap(self, index_prefix, domain_name, force=False):
        app_pipelines = self.select_app_pipelines_by(
            aos_domain_name=domain_name,
            status=["ACTIVE", "INACTIVE", "CREATING", "DELETING"],
        )
        for app_pipe in app_pipelines:
            the_index_prefix = app_pipe["aosParams"]["indexPrefix"]
            status = app_pipe.get("status")
            if fnmatchcase(index_prefix, the_index_prefix + "*") or fnmatchcase(
                the_index_prefix, index_prefix + "*"
            ):
                msg = f'Index prefix "{index_prefix}" overlaps "{the_index_prefix}" of app pipeline {app_pipe["id"]}'
                if status == "INACTIVE":
                    if force:
                        logger.warn(f"Force continue! {msg}")
                    else:
                        raise APIException(
                            msg, ErrorCode.OVERLAP_WITH_INACTIVE_INDEX_PREFIX
                        )
                else:
                    raise APIException(msg, ErrorCode.OVERLAP_INDEX_PREFIX)

    def select_app_pipelines_by(
        self, aos_domain_name: str = "", status: "list[str]" = ["ACTIVE", "INACTIVE"]
    ):
        response = self.app_pipeline_table.scan(
            FilterExpression=Attr("aosParams.domainName").eq(aos_domain_name)
            & Attr("status").is_in(status),
        )
        return response["Items"]
