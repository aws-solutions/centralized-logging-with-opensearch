# Upload SSL Certificate to IAM

Upload the SSL certificate by running the AWS CLI command `upload-server-certificate` similar to the following:

```
aws iam upload-server-certificate --path /cloudfront/ \
--server-certificate-name YourCertificate \
--certificate-body file://Certificate.pem \
--certificate-chain file://CertificateChain.pem \
--private-key file://PrivateKey.pem
```

Replace the file names and Your Certificate with the names for your uploaded files and certificate.
You must specify the `file://` prefix in the certificate-body, certificate-chain and private-key parameters in the API request. 
Otherwise, the request fails with a `MalformedCertificate: Unknown` error message.

!!! note "Note"

     You must specify a path using the --path option. The path must begin with /cloudfront and must include a 
     trailing slash (for example, /cloudfront/test/).

After the certificate is uploaded, the AWS command `upload-server-certificate` returns metadata for the uploaded certificate, including the certificate's Amazon Resource Name (ARN), friendly name, identifier (ID), and expiration date.

To view the uploaded certificate, run the AWS CLI command `list-server-certificates`:

```
aws iam list-server-certificates
```

For more information, see [uploading a server certificate](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html#upload-server-certificate){target='_blank'} to IAM.