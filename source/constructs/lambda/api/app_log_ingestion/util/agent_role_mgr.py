import logging
import os
import boto3
import time
from botocore import config
from util.sys_enum_type import SOURCETYPE
from util.assume_role import (
    generate_assume_role_statement_document,
    generate_assume_role_policy_document,
)
from util.exception import APIException
from util.aws_svc_mgr import SvcManager, Boto3API
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)
solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8009")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}
default_config = config.Config(**user_agent_config)
dynamodb = boto3.resource("dynamodb", config=default_config)
default_region = os.environ.get("AWS_REGION")

instance_group_table = dynamodb.Table(
    os.environ.get("INSTANCE_GROUP_TABLE_NAME"))
app_pipeline_table = dynamodb.Table(os.environ.get("APP_PIPELINE_TABLE_NAME"))
s3_log_source_table = dynamodb.Table(
    os.environ.get("S3_LOG_SOURCE_TABLE_NAME"))
eks_cluster_log_source_table = dynamodb.Table(
    os.environ.get("EKS_CLUSTER_SOURCE_TABLE_NAME"))

sts = boto3.client("sts", config=default_config)
account_id = sts.get_caller_identity()["Account"]

iam = boto3.client("iam", config=default_config)
iam_res = boto3.resource("iam", config=default_config)


class AgentRoleMgr:

    @staticmethod
    def generate_role(app_pipeline_id: str,
                      source_type: SOURCETYPE,
                      source_ids=list()):
        # create or update kds role
        trust_account_set = set()
        for sourceId in source_ids:
            if source_type.value == "EC2":
                source = instance_group_table.get_item(
                    Key={"id": sourceId})["Item"]
            elif source_type.value == "S3":
                source = s3_log_source_table.get_item(
                    Key={"id": sourceId})["Item"]
            else:
                source = eks_cluster_log_source_table.get_item(
                    Key={"id": sourceId})["Item"]
            if source.get(
                    "accountId") and account_id != source.get("accountId"):
                trust_account_set.add(source.get("accountId"))
        # gernerate statement
        trust_entites = list()
        app_pipeline = app_pipeline_table.get_item(
            Key={"id": app_pipeline_id})["Item"]

        # TODO: Double check this.
        role_arn = app_pipeline.get("bufferAccessRoleArn", "")
        role_name = app_pipeline.get("bufferAccessRoleName", "")
        if role_arn:
            # exist, update assume role policy document
            response = iam.get_role(RoleName=role_name)
            assume_role_policy_document_json = response["Role"][
                "AssumeRolePolicyDocument"]
            assume_role_statement = assume_role_policy_document_json[
                "Statement"]
            # remove duplicate accounts
            assume_role_statement_str = json.dumps(assume_role_statement)
            for trust_account in trust_account_set.copy():
                if assume_role_statement_str.find(trust_account) > 0:
                    trust_account_set.remove(trust_account)

            if len(trust_account_set) > 0:
                for trust_account in trust_account_set:
                    """
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
                    statement = generate_assume_role_statement_document(
                        account_id=trust_account)
                    trust_entites.append(json.loads(statement))

                trust_entites.extend(assume_role_statement)
                # generate policy document for assume role
                assume_role_policy_document = generate_assume_role_policy_document(
                    trust_entites)
                assume_role_policy = iam_res.AssumeRolePolicy(role_name)
                response = assume_role_policy.update(
                    PolicyDocument=assume_role_policy_document)
                # Make sure the role can be assumed
                # KDSRoleMgr.validate_kds_role(kdsRole=kdsRoleArn,
                #                              ids=trust_account_set)
                AgentRoleMgr.validate_role(roleArn=role_arn,
                                           ids=trust_account_set)
        else:
            # not exist
            logger.info(
                f"This application log pipeline({app_pipeline_id}) does not create a role for Buffering Layer, please create it manually through Lambda."
            )

    @staticmethod
    def validate_role(roleArn: str, ids=set()):
        if len(ids) == 0 or not ids:
            return

        svcMgr = SvcManager()
        retry_limit = 60
        role_valid = False
        error = ""
        for sub_account_id in ids:
            tried = 0
            session_name = f"validation-{sub_account_id}"
            while tried < retry_limit:
                try:
                    sts_ca = svcMgr.get_client(
                        sub_account_id=sub_account_id,
                        service_name="sts",
                        type=Boto3API.CLIENT,
                    )
                    res = sts_ca.assume_role(RoleArn=roleArn,
                                             RoleSessionName=session_name)
                    role_valid = True
                    break
                except Exception as e:
                    error = str(e)
                    time.sleep(1)
                    tried += 1

        if not role_valid:
            logger.error(error)
            raise APIException(
                f"The role used to send logs to Buffering layer takes too long to be active. Please try again."
            )
