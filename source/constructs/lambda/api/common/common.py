import logging

from fnmatch import fnmatchcase
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)


class ErrorCode:
    DuplicatedIndexPrefix = "DuplicatedIndexPrefix"
    DuplicatedWithInactiveIndexPrefix = "DuplicatedWithInactiveIndexPrefix"
    OverlapIndexPrefix = "OverlapIndexPrefix"
    OverlapWithInactiveIndexPrefix = "OverlapWithInactiveIndexPrefix"


class APIException(Exception):
    def __init__(self, message, code: str = None):
        if code:
            super().__init__("[{}] {}".format(code, message))
        else:
            super().__init__(message)


class AppPipelineValidator:
    def __init__(self, app_pipeline_table):
        self.app_pipeline_table = app_pipeline_table

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
            msg = f"Duplicate index prefex: {index_prefix}"
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
                    raise APIException(msg, ErrorCode.DuplicatedWithInactiveIndexPrefix)
            else:
                raise APIException(msg, ErrorCode.DuplicatedIndexPrefix)

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
                            msg, ErrorCode.OverlapWithInactiveIndexPrefix
                        )
                else:
                    raise APIException(msg, ErrorCode.OverlapIndexPrefix)

    def select_app_pipelines_by(
        self, aos_domain_name: str = "", status: "list[str]" = ["ACTIVE", "INACTIVE"]
    ):
        response = self.app_pipeline_table.scan(
            FilterExpression=Attr("aosParams.domainName").eq(aos_domain_name)
            & Attr("status").is_in(status),
        )
        return response["Items"]
