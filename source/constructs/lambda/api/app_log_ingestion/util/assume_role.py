import os
import json
from string import Template

from botocore import config

_role_policy_parser_template_path = './util/assume_role_template/assume_role_policy_document.template'
_statement_parser_template_path = './util/assume_role_template/assume_role_policy_document_statement.template'

solution_version = os.environ.get("SOLUTION_VERSION", "v1.0.0")
solution_id = os.environ.get("SOLUTION_ID", "SO8025")
user_agent_config = {
    "user_agent_extra": f"AwsSolution/{solution_id}/{solution_version}"
}

default_config = config.Config(**user_agent_config)
default_region = os.environ.get("AWS_REGION")


def render_template(filename, **kwds):
    with open(filename, 'r') as fp:
        s = Template(fp.read())
        return s.safe_substitute(**kwds)


def generate_assume_role_policy_document(statement_list=list()) -> str:
    statement_list_str = json.dumps(statement_list)
    return render_template(_role_policy_parser_template_path,
                           STATEMENT=statement_list_str)


def generate_assume_role_statement_document(account_id: str) -> str:
    if default_region in ["cn-north-1", "cn-northwest-1"]:
        account_str = f"arn:aws-cn:iam::{account_id}:root"
    else:
        account_str = f"arn:aws:iam::{account_id}:root"

    return render_template(_statement_parser_template_path,
                           ACCOUNT_ID=account_str)
