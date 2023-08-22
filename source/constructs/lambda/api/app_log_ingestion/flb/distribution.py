# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import io
import time
import logging
import json
from abc import ABC, abstractmethod
from typing import Set, List
from commonlib import AWSConnection, LinkAccountHelper
from commonlib.model import LogSource, AppLogIngestion
from commonlib.dao import AppLogIngestionDao
from flb.flb_builder import InstanceFlb
from commonlib import ErrorCode, APIException

s3_first_layer_prefix = "app_log_config"
config_file_s3_bucket_name = os.environ.get("CONFIG_FILE_S3_BUCKET_NAME")

logger = logging.getLogger()
logger.setLevel(logging.INFO)
conn = AWSConnection()

iam_res = conn.get_client(service_name="iam", client_type="resource")

# link account
sub_account_link_table_name = os.environ.get("SUB_ACCOUNT_LINK_TABLE_NAME")
account_helper = LinkAccountHelper(sub_account_link_table_name)

default_region = os.environ.get("AWS_REGION")
cwl_monitor_role_arn = os.environ.get("CWL_MONITOR_ROLE_ARN")


class FlbHandler(ABC):
    def __init__(self, ingestion_dao: AppLogIngestionDao):
        self._ingestion_dao = ingestion_dao

    def generate_flb_conf(self, instance_with_ingestion_list: dict(), link_account):
        bucket_name = link_account.get(
            "subAccountBucketName", config_file_s3_bucket_name
        )

        if bucket_name == config_file_s3_bucket_name:
            s3 = conn.get_client("s3")
        else:
            sub_account_role_arn = link_account.get("subAccountRoleArn")
            s3 = conn.get_client(
                "s3",
                region_name=link_account.get("region"),
                sts_role_arn=sub_account_role_arn,
            )

        instance_flb = InstanceFlb(cwl_monitor_role_arn)
        instance_flb.build_instance_data_pipelines(instance_with_ingestion_list)

        flb_conf_map = instance_flb.get_flb_conf_content("pipeline")
        for instance_id, conf_content in flb_conf_map.items():
            self.upload_content_to_s3(
                s3,
                subdir=instance_id,
                flb_content=conf_content,
                file_name="fluent-bit.conf",
                bucket_name=bucket_name,
            )

        flb_parser_map = instance_flb.get_flb_conf_content("parser")
        for instance_id, parser_content in flb_parser_map.items():
            self.upload_content_to_s3(
                s3,
                subdir=instance_id,
                flb_content=parser_content,
                file_name="applog_parsers.conf",
                bucket_name=bucket_name,
            )

    def upload_content_to_s3(
        self,
        s3,
        subdir: str,
        flb_content: str,
        file_name: str = "fluent-bit.conf",
        bucket_name: str = config_file_s3_bucket_name,
    ):
        """
        Write FluentBit configuration content to s3
        :param subdir: for EC2 scenario, subdir is instance_id; if it's the ingestion with syslog, subdir is syslog/port
        :param instance_flb_content:
        :param file_name:fluent-bit.conf or applog_parsers.conf
        :return:
        """
        logger.info("Uploading results to s3 initiated...")
        try:
            s3file = os.path.normpath(
                s3_first_layer_prefix + "/" + subdir + "/" + file_name
            )
            fo = io.BytesIO(b"%s" % (flb_content.encode("utf-8")))
            s3.upload_fileobj(fo, bucket_name, s3file)
        except Exception as e:
            logger.error(" ... Failed!! Quitting Upload!!")
            logger.error(e)
            raise e

    def update_role_policy(
        self, trust_account_set, sub_account_region, role_name, role_arn
    ):
        # exist, update assume role policy document
        iam_client = conn.get_client("iam")
        response = iam_client.get_role(RoleName=role_name)
        assume_role_policy_document_json = response["Role"]["AssumeRolePolicyDocument"]
        assume_role_statement = assume_role_policy_document_json["Statement"]
        # remove duplicate accounts
        assume_role_statement_str = json.dumps(assume_role_statement)
        for trust_account in trust_account_set.copy():
            if assume_role_statement_str.find(trust_account) > 0:
                trust_account_set.remove(trust_account)

        trust_entites: List[json] = []
        if len(trust_account_set) > 0:
            for trust_account in trust_account_set:
                """
                Assume role statement
                {
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::$ACCOUNT_ID:root"
                    },
                    "Action": "sts:AssumeRole",
                    "Condition": {
                    }
                }
                """
                statement = self.get_assume_role_statement_document(
                    account_id=trust_account
                )
                trust_entites.append(statement)

            trust_entites.extend(assume_role_statement)
            # generate policy document for assume role
            assume_role_policy_document = self.get_assume_role_policy_document(
                trust_entites
            )
            assume_role_policy = iam_res.AssumeRolePolicy(role_name)
            assume_role_policy.update(
                PolicyDocument=json.dumps(assume_role_policy_document)
            )
            # Make sure the role can be assumed
            self.validate_role(
                role_arn=role_arn,
                region=sub_account_region,
                trust_account_set=trust_account_set,
            )

    def validate_role(self, role_arn: str, region, trust_account_set: Set[str]):
        if len(trust_account_set) == 0 or not trust_account_set:
            return
        retry_limit = 30
        role_valid = False
        error = ""
        for sub_account_id in trust_account_set:
            tried = 0
            session_name = f"validation-{sub_account_id}"
            while tried < retry_limit:
                try:
                    link_account = account_helper.get_link_account(
                        sub_account_id, region
                    )
                    if link_account and "subAccountRoleArn" in link_account:
                        sts_ca = conn.get_client(
                            service_name="sts",
                            region_name=region,
                            sts_role_arn=link_account.get("subAccountRoleArn"),
                        )
                        sts_ca.assume_role(
                            RoleArn=role_arn, RoleSessionName=session_name
                        )
                    role_valid = True
                    break

                except Exception as e:
                    error = str(e)
                    time.sleep(1)
                    tried += 1

        if not role_valid:
            logger.error(error)
            raise APIException(
                code=ErrorCode.ASSUME_ROLE_CHECK_FAILED,
                message="The role used to send logs to Buffering layer takes too long to be active. Please try again.",
            )

    def get_assume_role_policy_document(self, statement_list=list()) -> dict:
        document = {"Version": "2012-10-17", "Statement": statement_list}
        return document

    def get_assume_role_statement_document(self, account_id: str) -> dict:
        if default_region in ["cn-north-1", "cn-northwest-1"]:
            account_str = f"arn:aws-cn:iam::{account_id}:root"
        else:
            account_str = f"arn:aws:iam::{account_id}:root"

        document = {
            "Effect": "Allow",
            "Principal": {"AWS": account_str},
            "Action": "sts:AssumeRole",
            "Condition": {},
        }
        return document

    @abstractmethod
    def create_ingestion(
        self, log_source: LogSource, app_log_ingestion: AppLogIngestion
    ):
        pass
