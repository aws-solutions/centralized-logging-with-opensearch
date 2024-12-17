# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
from utils.helpers import AWSConnection


class SESClient:
    """Amazon SES Client, used to interact with Amazon Simple Email Service"""

    def __init__(self):
        conn = AWSConnection()
        self._ses_client = conn.get_client("ses")

    def get_template(self, template_name: str) -> dict:
        try:
            response = self._ses_client.get_template(TemplateName=template_name)
        except Exception:
            response = {}

        return response

    def create_template(self, template_name: str, subject: str, text: str, html: str):
        return self._ses_client.create_template(
            Template={
                "TemplateName": template_name,
                "SubjectPart": subject,
                "TextPart": text,
                "HtmlPart": html,
            }
        )

    def delete_template(self, template_name: str) -> dict:
        try:
            response = self._ses_client.delete_template(TemplateName=template_name)
        except Exception:
            response = {}

        return response

    def get_identity_verification_attributes(self, identity: str):
        try:
            response = self._ses_client.get_identity_verification_attributes(
                Identities=[identity]
            )
        except Exception:
            response = {}

        return response

    def verify_email_identity(self, email_address: str):
        return self._ses_client.verify_email_identity(EmailAddress=email_address)

    def delete_identity(self, identity: str) -> dict:
        try:
            response = self._ses_client.delete_identity(Identity=identity)
        except Exception:
            response = {}

        return response

    def send_templated_email(
        self, source: str, to: list, template: str, data: dict
    ) -> dict:
        return self._ses_client.send_templated_email(
            Source=f"no-reply <{source}>",
            Destination={"ToAddresses": to},
            Template=template,
            TemplateData=json.dumps(data),
        )
