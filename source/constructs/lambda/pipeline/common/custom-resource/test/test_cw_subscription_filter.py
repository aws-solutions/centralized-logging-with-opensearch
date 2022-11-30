from moto import mock_logs, mock_sts


@mock_logs
@mock_sts
def test_lambda_handler_on_delete():
    from cw_subscription_filter import lambda_handler

    assert lambda_handler(
        {
            "RequestType": "Delete",
        },
        None,
    )
